from typing import Optional, List

from app.domain.graph.entities import (
    GlobalGraph,
    GraphNode,
    GraphPendingBlock,
    PendingStatusEnum,
)
from app.domain.graph.exceptions import GraphNodeNotFoundException
from app.domain.graph.ports import GraphRepositoryPort


class GraphQueryDomainService:

    def __init__(self, graph_repo: GraphRepositoryPort) -> None:
        self.graph_repo = graph_repo

    async def get_global_graph(self, project_id: Optional[str] = None) -> GlobalGraph:
        """查询项目或全局粒度的节点、关系边及超节点集合，直接返回纯粹领域实体聚合模型"""
        if project_id:
            nodes = await self.graph_repo.list_nodes_by_project(project_id)
        else:
            nodes = await self.graph_repo.list_all_nodes()

        node_ids = [node.id for node in nodes]
        edges = await self.graph_repo.list_edges_by_nodes(node_ids) if node_ids else []
        tags = await self.graph_repo.list_all_tags()

        return GlobalGraph(nodes=nodes, edges=edges, tag_super_nodes=tags)

    async def get_node_by_id(self, node_id: str) -> GraphNode:
        """根据 node_id 获取节点及其绑定的 block_ids，供应用层进一步跨领域反查原文内容"""
        node = await self.graph_repo.find_node_by_id(node_id)
        if not node:
            raise GraphNodeNotFoundException(node_id)
        return node

    async def fetch_pending_blocks(self, limit: int = 20) -> List[GraphPendingBlock]:
        """获取待处理的任务列表"""
        return await self.graph_repo.list_pending_blocks(
            status=PendingStatusEnum.PENDING, limit=limit
        )

    async def reset_stale_tasks(self, timeout_minutes: int = 15) -> int:
        """重置超时处于 PROCESSING 状态的僵尸任务为 PENDING"""
        return await self.graph_repo.reset_stale_processing_blocks(timeout_minutes)