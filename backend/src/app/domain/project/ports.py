"""项目与任务仓储接口 (Repository Port) 模块"""

from abc import abstractmethod
from typing import Optional, List
from app.domain.common.ports import DomainPort
from app.domain.project.entities import Project


class ProjectRepositoryPort(DomainPort):
    """Project 仓储防腐接口"""

    @abstractmethod
    async def get_by_id(self, project_id: str) -> Optional[Project]:
        pass

    @abstractmethod
    async def save(self, project: Project) -> None:
        pass

    @abstractmethod
    async def list_all(self) -> List[Project]:
        pass
