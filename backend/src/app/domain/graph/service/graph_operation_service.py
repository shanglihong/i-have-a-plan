"""旁路图谱与 RAG 领域操作与建图构建服务模块"""

import hashlib
import logging
import os
from app.domain.agent.service.spec import reading_companion_spec
from app.domain.graph.entities import ExtractedEntity
from datetime import datetime
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)

from app.domain.graph.entities import (
    GraphPendingBlock,
    GraphNode,
    GraphEdge,
    TagSuperNode,
    VectorChunkIndex,
    PendingStatusEnum,
    GraphNodeEntityTypeEnum,
    GraphRelationTypeEnum,
    SourceTypeEnum,
)
from app.domain.graph.exceptions import GraphTextMissingException
from app.domain.graph.ports import (
    GraphRepositoryPort,
    VectorStorePort,
    LLMGraphRAGExtractorPort,
)


class GraphOperationDomainService:
    """闲时增量构建与 Graph RAG 批处理领域服务"""

    def __init__(
        self,
        graph_repo: GraphRepositoryPort,
        vector_store: VectorStorePort,
        llm_extractor: LLMGraphRAGExtractorPort,
    ) -> None:
        self.graph_repo = graph_repo
        self.vector_store = vector_store
        self.llm_extractor = llm_extractor
        self.integrate_graph = os.getenv("INTEGRATE_GRAPH", "false").lower() in ("true", "1", "yes")

    async def enqueue_block(
        self,
        block_id: str,
        source_type: SourceTypeEnum = SourceTypeEnum.NOTE_CARD,
        project_id: str = "",
        book_id: str = "",
    ) -> GraphPendingBlock:
        """接收领域事件广播，往独立 graph_pending_blocks 写入 PENDING 记录"""
        existing = await self.graph_repo.find_pending_block_by_block_id(block_id)
        if existing:
            if existing.status == PendingStatusEnum.FAILED:
                existing.reset_to_pending()
                await self.graph_repo.save_pending_block(existing)
            return existing

        pending_block = GraphPendingBlock(
            block_id=block_id,
            source_type=source_type,
            project_id=project_id,
            book_id=book_id,
            status=PendingStatusEnum.PENDING,
        )
        await self.graph_repo.save_pending_block(pending_block)
        return pending_block


    async def process_single_block(
        self,
        block: GraphPendingBlock,
        real_text: str,
    ) -> None:
        """针对已补齐物理文本的单条 PENDING 任务，结合向量检索抽取强相关 Prompt 上下文并执行建图"""
        if not real_text:
            block.mark_failed(increment_retry=True)
            await self.graph_repo.save_pending_block(block)
            raise GraphTextMissingException(f"block_id={block.block_id}, source_type={block.source_type}")

        block.mark_processing()
        await self.graph_repo.save_pending_block(block)

        try:
            # 1. 幂等校验：若向量库已存在且文本未改变则直接完成
            is_unchanged, current_hash = await self._is_block_unchanged(block.block_id, real_text)
            if is_unchanged:
                block.mark_completed()
                await self.graph_repo.save_pending_block(block)
                return

            # 2. 向量化
            embedding = await self.llm_extractor.compute_embedding(text=real_text)

            # 3. vec 持久化
            vec_index = VectorChunkIndex(
                source_type=block.source_type,
                source_id=block.project_id,
                block_id=block.block_id,
                embedding=embedding,
                text_hash=current_hash,
            )
            await self.vector_store.save_vector_index(vec_index)

            # 图书段落切片 (BOOK_BLOCK) 仅需保存向量索引用于 RAG 检索，不抽取知识图谱节点与关系
            if block.source_type == SourceTypeEnum.BOOK_BLOCK:
                block.mark_completed()
                await self.graph_repo.save_pending_block(block)
                return

            # 检查是否集成旁路知识图谱 (默认不集成)
            if not self.integrate_graph:
                logger.info(f"[GraphOperation] INTEGRATE_GRAPH 为 False, 跳过知识图谱抽取与建图: block_id={block.block_id}")
                block.mark_completed()
                await self.graph_repo.save_pending_block(block)
                return

            # 4. 抽取并生成旁路图谱实体、关系边及超标签节点
            update_nodes, update_edges, update_tags = await self._extract_and_build_graph(
                block=block,
                real_text=real_text,
                embedding=embedding,
            )

            # 5. 标记完成并调用仓储原子批量持久化旁路图谱与状态
            block.mark_completed()
            await self.graph_repo.save_graph_batch(
                nodes=update_nodes,
                edges=update_edges,
                tags=update_tags,
                pending_block=block,
            )

        except Exception as e:
            block.mark_failed(increment_retry=True)
            await self.graph_repo.save_pending_block(block)
            raise e

    async def _extract_and_build_graph(
        self,
        block: GraphPendingBlock,
        real_text: str,
        embedding: List[float],
    ) -> Tuple[List[GraphNode], List[GraphEdge], List[TagSuperNode]]:
        """调用 LLM 结构化抽取并构建合并图原子节点、认知关系边及超标签节点"""
        # 1. 查询相关的 graph 节点
        _, related_nodes = await self._find_related_nodes(embedding=embedding)

        # 2. LLM 结构化抽取实体、关系与主题标签
        extracted_entities, extracted_relations, tags = (
            await self.llm_extractor.extract_entities_and_relations(
                real_text, [node.name for node in related_nodes]
            )
        )

        node_name_to_id: Dict[str, str] = {node.name: node.id for node in related_nodes}

        # 3. 实体概念合并与新建
        update_nodes: dict[str, GraphNode] = dict[str, GraphNode]()
        for ext_entity in extracted_entities:
            update_node = await self._get_new_node(
                GraphNode.from_extracted(
                    ext_entity=ext_entity,
                    block_id=block.block_id,
                    project_id=block.project_id,
                )
            )
            update_nodes[update_node.id] = update_node
            node_name_to_id[ext_entity.name] = update_node.id

        # 4. 认知关系边处理与证伪判断
        update_edges: dict[str, GraphEdge] = dict[str, GraphEdge]()
        for ext_rel in extracted_relations:
            src_id = node_name_to_id.get(ext_rel.source_node_name)
            tgt_id = node_name_to_id.get(ext_rel.target_node_name)

            if src_id and tgt_id and src_id != tgt_id:
                update_edge = await self._get_new_edge(
                    GraphEdge.from_extracted(
                        ext_rel=ext_rel,
                        source_node_id=src_id,
                        target_node_id=tgt_id,
                    )
                )
                if update_edge:
                    update_edges[update_edge.id] = update_edge
                    # 节点证伪
                    if update_edge.relation_type == GraphRelationTypeEnum.FALSIFIE and (node := update_nodes.get(tgt_id)):
                        node.falsify()

        # 5. 超标签节点处理
        update_tags: dict[str, TagSuperNode] = dict[str, TagSuperNode]()
        for tag_name in tags:
            tag_node = await self._get_new_tag(tag_name)
            update_tags[tag_node.id] = tag_node

        return list(update_nodes.values()), list(update_edges.values()), list(update_tags.values())
            


    async def _find_related_nodes(
        self,
        embedding: list[float],
        top_k: int = 20,
        max_limit: int = 100,
    ) -> Tuple[list[float], List[GraphNode]]:
        """通过文本算向量在 vector_store 中通过向量相似度检索"""
        similar_chunks = await self.vector_store.search_similar_vectors(embedding, top_k=top_k)

        node_map: Dict[str, GraphNode] = {}
        for chunk in similar_chunks:
            nodes = await self.graph_repo.find_nodes_by_block_id(chunk.block_id)
            for node in nodes:
                node_map[node.id] = node

        return embedding, list(node_map.values())[:max_limit]


    async def _get_new_node(
        self,
        new_extracted_node: GraphNode,
    ) -> GraphNode:
        """根据 LLM 抽取实体，自动判定并执行已存在节点的合并保存或新节点创建保存"""
        existing_node = await self.graph_repo.find_node_by_name_and_type(
            name=new_extracted_node.name, entity_type=new_extracted_node.entity_type
        )
        if existing_node:
            existing_node.merge(new_extracted_node)
            return existing_node

        return new_extracted_node

    async def _get_new_edge(
        self,
        new_extracted_edge: GraphEdge,
    ) -> Optional[GraphEdge]:
        """判定认知关系边是否存在，若不存在则保存并返回新边；若已存在则返回 None"""
        existing_edge = await self.graph_repo.find_edge_between(
            new_extracted_edge.source_node_id,
            new_extracted_edge.target_node_id,
            new_extracted_edge.relation_type,
        )
        if not existing_edge:
            return new_extracted_edge
        return None

    async def _get_new_tag(
        self,
        tag_name: str,
    ) -> TagSuperNode:
        """根据标签名称查找并更新节点计数，若不存在则创建新 TagSuperNode 实例"""
        tag_node = await self.graph_repo.find_tag_by_name(tag_name)
        if tag_node:
            tag_node.node_count += 1
            return tag_node
        return TagSuperNode(name=tag_name, node_count=1)

    async def _is_block_unchanged(
        self, block_id: str, real_text: str
    ) -> Tuple[bool, str]:
        """校验切片文本哈希指纹是否与已有向量库一致（未改变）并返回计算出的 current_hash"""
        current_hash = hashlib.md5(real_text.encode("utf-8")).hexdigest()
        existing_vec = await self.vector_store.find_vector_by_block_id(block_id)
        is_unchanged = bool(existing_vec and existing_vec.text_hash == current_hash)
        return is_unchanged, current_hash