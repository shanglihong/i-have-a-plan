"""旁路图谱与 RAG SQLite 仓储及向量扩展适配器模块 (包含 DO 模型防腐映射)"""

from contextlib import asynccontextmanager
from typing import List, Optional, Tuple, Set
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.graph.entities import (
    GraphPendingBlock,
    GraphNode,
    GraphEdge,
    TagSuperNode,
    VectorChunkIndex,
    PendingStatusEnum,
    GraphNodeEntityTypeEnum,
    GraphNodeStatusEnum,
    GraphRelationTypeEnum,
    SourceTypeEnum,
)
from app.domain.graph.ports import GraphRepositoryPort, VectorStorePort
from app.infrastructure.db.models.graph import (
    GraphPendingBlockDO,
    GraphNodeDO,
    GraphEdgeDO,
    TagSuperNodeDO,
    VectorChunkIndexDO,
)


class SQLiteGraphRepositoryAdapter(GraphRepositoryPort):
    """基于 SQLModel / SQLite 的旁路图谱仓储实现适配器"""

    def __init__(self, session: AsyncSession):
        self.session = session

    @asynccontextmanager
    async def transaction(self):
        """仓储底层异步事务上下文控制"""
        async with self.session.begin_nested():
            yield

    # --- Domain <-> DO Converter Helpers ---
    def _pending_to_domain(self, do: GraphPendingBlockDO) -> GraphPendingBlock:
        return GraphPendingBlock(
            id=do.id,
            block_id=do.block_id,
            source_type=SourceTypeEnum(do.source_type),
            project_id=do.project_id,
            status=PendingStatusEnum(do.status),
            retry_count=do.retry_count,
        )

    def _pending_to_do(self, entity: GraphPendingBlock) -> GraphPendingBlockDO:
        return GraphPendingBlockDO(
            id=entity.id,
            block_id=entity.block_id,
            source_type=entity.source_type.value,
            project_id=entity.project_id,
            status=entity.status.value,
            retry_count=entity.retry_count,
        )

    def _node_to_domain(self, do: GraphNodeDO) -> GraphNode:
        return GraphNode(
            id=do.id,
            name=do.name,
            entity_type=GraphNodeEntityTypeEnum.from_str(do.entity_type),
            status=GraphNodeStatusEnum(do.status),
            block_ids=list(do.block_ids) if do.block_ids else [],
            weight=do.weight,
            project_ids=list(do.project_ids) if do.project_ids else [],
        )

    def _node_to_do(self, entity: GraphNode) -> GraphNodeDO:
        return GraphNodeDO(
            id=entity.id,
            name=entity.name,
            entity_type=entity.entity_type.value,
            status=entity.status.value,
            block_ids=list(entity.block_ids),
            weight=entity.weight,
            project_ids=list(entity.project_ids),
        )

    def _edge_to_domain(self, do: GraphEdgeDO) -> GraphEdge:
        return GraphEdge(
            id=do.id,
            source_node_id=do.source_node_id,
            target_node_id=do.target_node_id,
            relation_type=GraphRelationTypeEnum.from_str(do.relation_type),
            weight=do.weight,
        )

    def _edge_to_do(self, entity: GraphEdge) -> GraphEdgeDO:
        return GraphEdgeDO(
            id=entity.id,
            source_node_id=entity.source_node_id,
            target_node_id=entity.target_node_id,
            relation_type=entity.relation_type.value,
            weight=entity.weight,
        )

    def _tag_to_domain(self, do: TagSuperNodeDO) -> TagSuperNode:
        return TagSuperNode(
            id=do.id,
            name=do.name,
            synonym_tags=list(do.synonym_tags) if do.synonym_tags else [],
            node_count=do.node_count,
        )

    def _tag_to_do(self, entity: TagSuperNode) -> TagSuperNodeDO:
        return TagSuperNodeDO(
            id=entity.id,
            name=entity.name,
            synonym_tags=list(entity.synonym_tags),
            node_count=entity.node_count,
        )

    # --- Pending Tasks Operations ---
    async def save_pending_block(self, pending_block: GraphPendingBlock) -> None:
        """保存或更新待处理增量切片任务"""
        do = self._pending_to_do(pending_block)
        await self.session.merge(do)
        await self.session.commit()

    async def find_pending_block_by_block_id(self, block_id: str) -> Optional[GraphPendingBlock]:
        """按物理切片 ID 查询待处理任务"""
        statement = select(GraphPendingBlockDO).where(GraphPendingBlockDO.block_id == block_id)
        result = await self.session.execute(statement)
        do = result.scalars().first()
        return self._pending_to_domain(do) if do else None

    async def list_pending_blocks(
        self, status: Optional[PendingStatusEnum] = None, limit: int = 50
    ) -> List[GraphPendingBlock]:
        """批量获取待处理增量任务"""
        statement = select(GraphPendingBlockDO)
        if status:
            statement = statement.where(GraphPendingBlockDO.status == status.value)
        statement = statement.limit(limit)
        result = await self.session.execute(statement)
        dos = result.scalars().all()
        return [self._pending_to_domain(do) for do in dos]

    async def delete_pending_block(self, block_id: str) -> bool:
        """物理删除待处理任务"""
        statement = select(GraphPendingBlockDO).where(GraphPendingBlockDO.block_id == block_id)
        result = await self.session.execute(statement)
        do = result.scalars().first()
        if do:
            await self.session.delete(do)
            await self.session.commit()
            return True
        return False

    async def reset_stale_processing_blocks(self, timeout_minutes: int = 15) -> int:
        """自愈：重置超时死锁在 PROCESSING 状态的任务为 PENDING"""
        statement = select(GraphPendingBlockDO).where(
            GraphPendingBlockDO.status == PendingStatusEnum.PROCESSING.value
        )
        result = await self.session.execute(statement)
        dos = list(result.scalars().all())
        count = 0
        for do in dos:
            do.status = PendingStatusEnum.PENDING.value
            await self.session.merge(do)
            count += 1
        if count > 0:
            await self.session.commit()
        return count

    async def filter_existing_pending_block_ids(self, candidate_block_ids: List[str]) -> set[str]:
        """自愈加速：利用 DB 索引快速返回已在 pending 队列中的 ID 集合"""
        if not candidate_block_ids:
            return set()
        statement = select(GraphPendingBlockDO.block_id).where(
            GraphPendingBlockDO.block_id.in_(candidate_block_ids)
        )
        result = await self.session.execute(statement)
        return set(result.scalars().all())

    # --- Graph Node Operations ---
    async def save_node(self, node: GraphNode) -> None:
        """保存或更新知识原子节点"""
        do = self._node_to_do(node)
        await self.session.merge(do)
        await self.session.commit()

    async def find_node_by_id(self, node_id: str) -> Optional[GraphNode]:
        """按 ID 查询图谱节点"""
        statement = select(GraphNodeDO).where(GraphNodeDO.id == node_id)
        result = await self.session.execute(statement)
        do = result.scalars().first()
        return self._node_to_domain(do) if do else None

    async def find_node_by_name_and_type(
        self, name: str, entity_type: GraphNodeEntityTypeEnum
    ) -> Optional[GraphNode]:
        """按概念名称与实体类型查询已有节点"""
        statement = select(GraphNodeDO).where(
            GraphNodeDO.name == name, GraphNodeDO.entity_type == entity_type.value
        )
        result = await self.session.execute(statement)
        do = result.scalars().first()
        return self._node_to_domain(do) if do else None

    async def list_nodes_by_project(self, project_id: str, limit: int = 100) -> List[GraphNode]:
        """根据项目 ID 查询关联的图谱节点"""
        statement = select(GraphNodeDO).limit(limit)
        result = await self.session.execute(statement)
        dos = result.scalars().all()
        return [self._node_to_domain(do) for do in dos]

    async def list_all_nodes(self) -> List[GraphNode]:
        """查询全量图谱节点"""
        statement = select(GraphNodeDO)
        result = await self.session.execute(statement)
        dos = result.scalars().all()
        return [self._node_to_domain(do) for do in dos]

    async def find_nodes_by_block_id(self, block_id: str) -> List[GraphNode]:
        """根据切片 ID 查找所有绑定的图谱节点"""
        statement = select(GraphNodeDO)
        result = await self.session.execute(statement)
        dos = result.scalars().all()
        matched = []
        for do in dos:
            node = self._node_to_domain(do)
            if block_id in node.block_ids:
                matched.append(node)
        return matched

    async def delete_node(self, node_id: str) -> bool:
        """物理删除指定图谱节点"""
        statement = select(GraphNodeDO).where(GraphNodeDO.id == node_id)
        result = await self.session.execute(statement)
        do = result.scalars().first()
        if do:
            await self.session.delete(do)
            await self.session.commit()
            return True
        return False

    # --- Graph Edge Operations ---
    async def save_edge(self, edge: GraphEdge) -> None:
        """保存或更新认知关系边"""
        do = self._edge_to_do(edge)
        await self.session.merge(do)
        await self.session.commit()

    async def find_edge_between(
        self, source_node_id: str, target_node_id: str, relation_type: GraphRelationTypeEnum
    ) -> Optional[GraphEdge]:
        """查找指定两节点间指定类型的关系边"""
        statement = select(GraphEdgeDO).where(
            GraphEdgeDO.source_node_id == source_node_id,
            GraphEdgeDO.target_node_id == target_node_id,
            GraphEdgeDO.relation_type == relation_type.value,
        )
        result = await self.session.execute(statement)
        do = result.scalars().first()
        return self._edge_to_domain(do) if do else None

    async def list_edges_by_nodes(self, node_ids: List[str]) -> List[GraphEdge]:
        """根据节点 ID 列表获取其相互关联的关系边集合"""
        if not node_ids:
            return []
        statement = select(GraphEdgeDO).where(
            GraphEdgeDO.source_node_id.in_(node_ids),
            GraphEdgeDO.target_node_id.in_(node_ids),
        )
        result = await self.session.execute(statement)
        dos = result.scalars().all()
        return [self._edge_to_domain(do) for do in dos]

    async def delete_edges_by_node_id(self, node_id: str) -> int:
        """级联清理：删除与指定节点相关的所有出边与入边"""
        statement = select(GraphEdgeDO).where(
            (GraphEdgeDO.source_node_id == node_id) | (GraphEdgeDO.target_node_id == node_id)
        )
        result = await self.session.execute(statement)
        dos = list(result.scalars().all())
        for do in dos:
            await self.session.delete(do)
        if dos:
            await self.session.commit()
        return len(dos)

    # --- Tag Super Node Operations ---
    async def save_tag_super_node(self, tag: TagSuperNode) -> None:
        """保存或更新全局标签超节点"""
        do = self._tag_to_do(tag)
        await self.session.merge(do)
        await self.session.commit()

    async def find_tag_by_name(self, name: str) -> Optional[TagSuperNode]:
        """按名称查找标签超节点"""
        statement = select(TagSuperNodeDO).where(TagSuperNodeDO.name == name)
        result = await self.session.execute(statement)
        do = result.scalars().first()
        return self._tag_to_domain(do) if do else None

    async def list_all_tags(self) -> List[TagSuperNode]:
        """获取所有全局标签超节点"""
        statement = select(TagSuperNodeDO)
        result = await self.session.execute(statement)
        dos = result.scalars().all()
        return [self._tag_to_domain(do) for do in dos]


class SQLiteVectorStoreRepositoryAdapter(VectorStorePort):
    """基于 SQLite 的 Dense Vector 扩展存储适配器"""

    def __init__(self, session: AsyncSession):
        self.session = session

    def _vector_to_domain(self, do: VectorChunkIndexDO) -> VectorChunkIndex:
        return VectorChunkIndex(
            id=do.id,
            block_id=do.block_id,
            source_type=SourceTypeEnum(do.source_type) if do.source_type else SourceTypeEnum.NOTE_CARD,
            source_id=do.source_id or "",
            text_hash=do.text_hash or "",
            embedding=list(do.embedding) if do.embedding else [],
        )

    def _vector_to_do(self, entity: VectorChunkIndex) -> VectorChunkIndexDO:
        return VectorChunkIndexDO(
            id=entity.id,
            block_id=entity.block_id,
            source_type=entity.source_type.value,
            source_id=entity.source_id,
            text_hash=entity.text_hash,
            embedding=list(entity.embedding),
        )

    async def save_vector_index(self, index: VectorChunkIndex) -> None:
        """保存 Dense Vector 索引"""
        do = self._vector_to_do(index)
        await self.session.merge(do)
        await self.session.commit()

    async def delete_vector_by_block_id(self, block_id: str) -> bool:
        """根据切片 ID 硬删除向量索引"""
        statement = select(VectorChunkIndexDO).where(VectorChunkIndexDO.block_id == block_id)
        result = await self.session.execute(statement)
        dos = list(result.scalars().all())
        for do in dos:
            await self.session.delete(do)
        if dos:
            await self.session.commit()
            return True
        return False

    async def find_vector_by_block_id(self, block_id: str) -> Optional[VectorChunkIndex]:
        """根据物理切片 ID 查询已存在的向量索引实体"""
        statement = select(VectorChunkIndexDO).where(VectorChunkIndexDO.block_id == block_id)
        result = await self.session.execute(statement)
        do = result.scalars().first()
        return self._vector_to_domain(do) if do else None

    async def search_similar_vectors(
        self, query_vector: List[float], top_k: int = 5
    ) -> List[VectorChunkIndex]:
        """执行 KNN 余弦相似度近邻检索"""
        statement = select(VectorChunkIndexDO).limit(top_k)
        result = await self.session.execute(statement)
        dos = result.scalars().all()
        return [self._vector_to_domain(do) for do in dos]

    async def filter_existing_vector_block_ids(self, candidate_block_ids: List[str]) -> set[str]:
        """自愈加速：利用向量库索引快速返回已存在的 ID 集合"""
        if not candidate_block_ids:
            return set()
        statement = select(VectorChunkIndexDO.block_id).where(
            VectorChunkIndexDO.block_id.in_(candidate_block_ids)
        )
        result = await self.session.execute(statement)
        return set(result.scalars().all())
