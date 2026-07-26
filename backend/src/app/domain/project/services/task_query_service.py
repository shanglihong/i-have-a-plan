"""任务只读查询与 DAG 算法领域服务 (Domain Service)"""

from typing import List, Dict, Optional
from app.domain.project.entities import Task, TaskChain
from app.domain.project.ports import TaskRepositoryPort


class TaskQueryDomainService:
    """任务查询与依赖图计算领域服务"""

    def __init__(self, task_repo: Optional[TaskRepositoryPort] = None):
        self.task_repo = task_repo

    async def get_task_chains(self, project_id: str) -> List[TaskChain]:
        if not self.task_repo:
            return []
        return await self.task_repo.get_task_chains_by_project_id(project_id)

    @staticmethod
    def validate_dag(tasks: List[Task]) -> bool:
        """校验任务依赖列表是否构成无环有向图 (DAG)，如果存在环路依赖则返回 False"""
        task_map: Dict[str, Task] = {t.id: t for t in tasks if t.id}
        visited: Dict[str, int] = {}  # 0: 未访问, 1: 访问中, 2: 已完成

        def dfs(node_id: str) -> bool:
            visited[node_id] = 1
            task = task_map.get(node_id)
            if task and task.depends_on_task_ids:
                for dep_id in task.depends_on_task_ids:
                    if dep_id not in task_map:
                        continue
                    state = visited.get(dep_id, 0)
                    if state == 1:
                        return False  # 检测到有向环路
                    if state == 0:
                        if not dfs(dep_id):
                            return False
            visited[node_id] = 2
            return True

        for task_id in task_map:
            if visited.get(task_id, 0) == 0:
                if not dfs(task_id):
                    return False
        return True
