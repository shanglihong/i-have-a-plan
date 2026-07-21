"""
领域层防腐接口 (Domain Ports)

Repository Port 定义归属于调用方（领域层），由基础设施层负责实现。
遵循依赖反转原则（DIP）：领域层依赖抽象，基础设施层依赖领域层接口。
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.domain.project.entities import Project, Task


class ProjectRepositoryPort(ABC):
    """项目仓储接口 (Port)"""

    @abstractmethod
    async def get_by_id(self, project_id: str) -> "Project | None":
        """根据 ID 获取项目"""
        ...

    @abstractmethod
    async def list_all(self, page: int = 1, size: int = 20) -> tuple[list["Project"], int]:
        """分页获取项目列表，返回 (items, total)"""
        ...

    @abstractmethod
    async def save(self, project: "Project") -> "Project":
        """新增或更新项目"""
        ...

    @abstractmethod
    async def delete(self, project_id: str) -> None:
        """硬删除项目"""
        ...


class TaskRepositoryPort(ABC):
    """任务仓储接口 (Port)"""

    @abstractmethod
    async def list_by_project(self, project_id: str) -> list["Task"]:
        """获取项目下所有任务（含子任务树）"""
        ...

    @abstractmethod
    async def save(self, task: "Task") -> "Task":
        """新增或更新任务"""
        ...

    @abstractmethod
    async def save_many(self, tasks: list["Task"]) -> None:
        """批量更新（用于重调度事务落盘）"""
        ...
