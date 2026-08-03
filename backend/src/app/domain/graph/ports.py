"""旁路图谱与 RAG 仓储及防腐接口模块 (Ports)"""

from abc import abstractmethod
from typing import List, Optional, Tuple
from app.domain.base import DomainPort
from app.domain.graph.entities import (
    GraphPendingBlock,
    GraphNode,
    GraphEdge,
    TagSuperNode,
    VectorChunkIndex,
    PendingStatusEnum,
    GraphNodeEntityTypeEnum,
    GraphRelationTypeEnum,
    ExtractedEntity,
    ExtractedRelation,
)


class GraphRepositoryPort(DomainPort):
    """图谱实体与增量排队任务 SQLite 仓储防腐接口"""

    @abstractmethod
    def transaction(self):
        """仓储底层事务上下文接口"""
        ...

    @abstractmethod
    async def save_graph_batch(
        self,
        nodes: List[GraphNode],
        edges: List[GraphEdge],
        tags: List[TagSuperNode],
        pending_block: Optional[GraphPendingBlock] = None,
    ) -> None:
        """原子批量保存节点、关系边、标签超节点及待处理切片任务"""
        ...

    # --- Pending Tasks Operations ---
    @abstractmethod
    async def save_pending_block(self, pending_block: GraphPendingBlock) -> None:
        """保存或更新待处理增量切片任务"""
        ...

    @abstractmethod
    async def find_pending_block_by_block_id(self, block_id: str) -> Optional[GraphPendingBlock]:
        """按物理切片 ID 查询待处理任务"""
        ...

    @abstractmethod
    async def list_pending_blocks(
        self, status: Optional[PendingStatusEnum] = None, limit: int = 50
    ) -> List[GraphPendingBlock]:
        """批量获取待处理增量任务"""
        ...

    @abstractmethod
    async def delete_pending_block(self, block_id: str) -> bool:
        """物理删除待处理任务"""
        ...

    @abstractmethod
    async def reset_stale_processing_blocks(self, timeout_minutes: int = 15) -> int:
        """自愈：重置超时 15 分钟死锁在 PROCESSING 状态的任务为 PENDING，返回影响记录行数"""
        ...

    @abstractmethod
    async def filter_existing_pending_block_ids(self, candidate_block_ids: List[str]) -> set[str]:
        """自愈加速：传入候选切片 ID 列表，利用 DB 索引快速返回已在 pending 队列中的 ID 集合"""
        ...

    # --- Graph Node Operations ---
    @abstractmethod
    async def save_node(self, node: GraphNode) -> None:
        """保存或更新知识原子节点 (支持同名合并后的全量保存)"""
        ...

    @abstractmethod
    async def find_node_by_id(self, node_id: str) -> Optional[GraphNode]:
        """按 ID 查询图谱节点"""
        ...

    @abstractmethod
    async def find_node_by_name_and_type(
        self, name: str, entity_type: GraphNodeEntityTypeEnum
    ) -> Optional[GraphNode]:
        """按概念名称与实体类型查询已有节点 (用于 Concept Merging)"""
        ...

    @abstractmethod
    async def list_nodes_by_project(self, project_id: str, limit: int = 100) -> List[GraphNode]:
        """根据项目 ID 查询项目专属及包含该项目的图谱节点列表 (默认限制 Top 100 节点)"""
        ...

    @abstractmethod
    async def list_all_nodes(self) -> List[GraphNode]:
        """查询全量图谱节点"""
        ...

    @abstractmethod
    async def find_nodes_by_block_id(self, block_id: str) -> List[GraphNode]:
        """根据切片 ID 查找所有绑定的图谱节点"""
        ...

    @abstractmethod
    async def delete_node(self, node_id: str) -> bool:
        """物理删除指定图谱节点"""
        ...

    # --- Graph Edge Operations ---
    @abstractmethod
    async def save_edge(self, edge: GraphEdge) -> None:
        """保存或更新认知关系边"""
        ...

    @abstractmethod
    async def find_edge_between(
        self, source_node_id: str, target_node_id: str, relation_type: GraphRelationTypeEnum
    ) -> Optional[GraphEdge]:
        """查找指定两节点间指定类型的关系边"""
        ...

    @abstractmethod
    async def list_edges_by_nodes(self, node_ids: List[str]) -> List[GraphEdge]:
        """根据节点 ID 列表获取其相互关联的关系边集合"""
        ...

    @abstractmethod
    async def delete_edges_by_node_id(self, node_id: str) -> int:
        """级联清理：删除与指定节点相关的所有出边与入边"""
        ...

    # --- Tag Super Node Operations ---
    @abstractmethod
    async def save_tag_super_node(self, tag: TagSuperNode) -> None:
        """保存或更新全局标签超节点"""
        ...

    @abstractmethod
    async def find_tag_by_name(self, name: str) -> Optional[TagSuperNode]:
        """按名称查找标签超节点"""
        ...

    @abstractmethod
    async def list_all_tags(self) -> List[TagSuperNode]:
        """获取所有全局标签超节点"""
        ...


class VectorStorePort(DomainPort):
    """sqlite-vec 密集向量扩展适配器防腐接口"""

    @abstractmethod
    async def save_vector_index(self, index: VectorChunkIndex) -> None:
        """将 Dense Vector 存入 sqlite-vec 扩展虚表"""
        ...

    @abstractmethod
    async def delete_vector_by_block_id(self, block_id: str) -> bool:
        """根据切片 ID 即时硬删除向量索引"""
        ...

    @abstractmethod
    async def find_vector_by_block_id(self, block_id: str) -> Optional[VectorChunkIndex]:
        """根据物理切片 ID 查询已存在的向量索引实体"""
        ...

    @abstractmethod
    async def search_similar_vectors(
        self, query_vector: List[float], top_k: int = 5
    ) -> List[VectorChunkIndex]:
        """执行 KNN 余弦相似度近邻检索"""
        ...

    @abstractmethod
    async def filter_existing_vector_block_ids(self, candidate_block_ids: List[str]) -> set[str]:
        """自愈加速：传入候选切片 ID 列表，利用 sqlite-vec 索引快速返回已在向量库中的 ID 集合"""
        ...


class LLMGraphRAGExtractorPort(DomainPort):
    """LLM Pipeline 适配器防腐接口 (Dense Vector 计算与 Graph RAG 抽取)"""

    @abstractmethod
    async def compute_embedding(self, text: str) -> List[float]:
        """计算文本的 Dense Vector (1536 维 Float 列表)"""
        ...

    @abstractmethod
    async def extract_entities_and_relations(
        self, text: str, existing_nodes_context: List[str]
    ) -> Tuple[List[ExtractedEntity], List[ExtractedRelation], List[str]]:
        """
        输入富文本与旧节点上下文，调用 LLM 抽取实体、关系边 (含 FALSIFIE) 及标签 (Tags)。
        """
        ...
