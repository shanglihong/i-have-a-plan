"""项目与任务领域服务模块

包含拓扑依赖校验、拖拽半自动重调度算法等领域纯逻辑计算。
"""

from typing import List
from app.domain.project.entities import Task


class ProjectDomainService:
    """项目领域逻辑计算服务"""

    @staticmethod
    def validate_dag(tasks: List[Task]) -> bool:
        """校验任务依赖列表是否构成无环有向图 (DAG)"""
        # 存根：后续填充拓扑排序逻辑
        return True
