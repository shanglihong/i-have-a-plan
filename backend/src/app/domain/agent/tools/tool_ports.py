"""Agent 工具所依赖的外部领域 Outbound Ports

工具在调用时需要跨领域访问能力（如查询书籍内容、挂载任务树），
这些依赖通过此处定义的 Port 接口解耦，由 container.py 在外部注入具体实现。
"""

from abc import ABC, abstractmethod
from typing import Any, Dict


class BookQueryPort(ABC):
    """Book 领域正文与锚点切片查询端口"""

    @abstractmethod
    async def get_content_block_by_id(self, block_id: str) -> Dict[str, Any]:
        """获取指定切片的内容字典描述"""
        pass


class ProjectTaskPort(ABC):
    """Project/Task 领域任务树挂载端口"""

    @abstractmethod
    async def attach_generated_task_tree(self, project_id: str, task_chains_data: Dict[str, Any]) -> bool:
        """将生成的任务树挂载到指定项目上，执行事务级别的落盘"""
        pass
