"""项目自愈策略抽象基类模块"""

from abc import ABC, abstractmethod
from typing import Optional
from app.domain.project.entities import Project, ProjectType
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort


class BaseProjectHealer(ABC):
    """项目自愈策略抽象基类"""

    def __init__(self, project_repo: ProjectRepositoryPort, task_repo: TaskRepositoryPort):
        self.project_repo = project_repo
        self.task_repo = task_repo

    @property
    @abstractmethod
    def target_type(self) -> ProjectType:
        """所支持的项目类型"""
        pass

    @abstractmethod
    async def heal(self, project: Project) -> Optional[str]:
        """执行单个项目的自愈修复逻辑

        Returns:
            Optional[str]: 自愈结果摘要信息
        """
        pass
