"""项目与任务仓储接口 (Repository Port) 模块"""

from abc import abstractmethod
from typing import Optional, List, Tuple
from app.domain.base import SortOrder
from app.domain.base import DomainPort
from app.domain.project.entities import (
    Project,
    ProjectSortBy,
    ProjectStatus,
    ProjectType,
    TaskChain,
    Task,
    TaskStatus,
)


class ProjectRepositoryPort(DomainPort):
    """Project 项目元数据仓储防腐接口 (与 Task 存储层解耦)"""

    @abstractmethod
    async def get_by_id(self, project_id: str) -> Optional[Project]:
        """按 ID 查询 Project 实体元数据"""
        pass

    @abstractmethod
    async def save(self, project: Project) -> None:
        """保存/更新 Project 实体元数据"""
        pass

    @abstractmethod
    async def list_projects(
        self,
        status: Optional[ProjectStatus] = None,
        project_type: Optional[ProjectType] = None,
        sort_by: ProjectSortBy = ProjectSortBy.UPDATED_AT,
        order: SortOrder = SortOrder.DESC,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Project], int]:
        """分页与条件查询项目列表，返回 (项目列表, 总条数)"""
        pass

    @abstractmethod
    async def delete(self, project_id: str) -> bool:
        """删除项目元数据"""
        pass


class TaskRepositoryPort(DomainPort):
    """Task / TaskChain 独立任务仓储防腐接口 (存储层分离)"""

    @abstractmethod
    async def save_task_chains(self, project_id: str, task_chains: List[TaskChain]) -> None:
        """保存或更新项目关联的任务链与任务树"""
        pass

    @abstractmethod
    async def get_task_chains_by_project_id(self, project_id: str) -> List[TaskChain]:
        """根据 project_id 获取对应的任务链与任务树"""
        pass

    @abstractmethod
    async def update_task_status(self, task_id: str, status: TaskStatus) -> Optional[Task]:
        """更新单个 Task 的微观执行状态"""
        pass

    @abstractmethod
    async def get_task_by_id(self, task_id: str) -> Optional[Task]:
        """按 ID 获取单个 Task"""
        pass

    @abstractmethod
    async def delete_by_project_id(self, project_id: str) -> bool:
        """删除项目关联的所有任务链与任务"""
        pass

