"""旁路图谱与 RAG 仓储接口模块"""

from abc import abstractmethod
from typing import List, Optional
from app.domain.common.ports import DomainPort
from app.domain.graph.entities import GraphNode, GraphEdge, VectorChunkIndex


class GraphRepositoryPort(DomainPort):
    """图谱与向量数据库防腐接口"""

    @abstractmethod
    async def save_node(self, node: GraphNode) -> None:
        pass

    @abstractmethod
    async def save_edge(self, edge: GraphEdge) -> None:
        pass

    @abstractmethod
    async def search_similar_chunks(self, query_vector: List[float], top_k: int = 5) -> List[VectorChunkIndex]:
        pass
