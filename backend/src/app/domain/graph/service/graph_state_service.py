from app.domain.graph.ports import (
    GraphRepositoryPort,
    VectorStorePort,
)


class GraphStateDomainService:

    def __init__(
        self, graph_repo: GraphRepositoryPort, vector_store: VectorStorePort
    ) -> None:
        self.graph_repo = graph_repo
        self.vector_store = vector_store

    async def cleanup_by_block_id(self, block_id: str) -> int:
        """根据切片 ID 级联清理向量索引、解绑节点及修剪孤儿节点与关联边"""
        await self.vector_store.delete_vector_by_block_id(block_id)

        async with self.graph_repo.transaction():
            await self.graph_repo.delete_pending_block(block_id)
            nodes = await self.graph_repo.find_nodes_by_block_id(block_id)
            pruned_count = 0

            for node in nodes:
                is_orphan = node.remove_block_binding(block_id)
                if is_orphan:
                    await self.graph_repo.delete_node(node.id)
                    await self.graph_repo.delete_edges_by_node_id(node.id)
                    pruned_count += 1
                else:
                    await self.graph_repo.save_node(node)

            return pruned_count

    async def get_missing_block_ids(
        self, candidate_block_ids: list[str]
    ) -> list[str]:
        """批量差集筛选出既不在向量库中也不在待处理队列中的缺失切片 ID 列表"""
        if not candidate_block_ids:
            return []

        indexed_vec_ids = await self.vector_store.filter_existing_vector_block_ids(candidate_block_ids)
        existing_pending_ids = await self.graph_repo.filter_existing_pending_block_ids(candidate_block_ids)

        return [
            b_id
            for b_id in candidate_block_ids
            if b_id not in indexed_vec_ids and b_id not in existing_pending_ids
        ]
