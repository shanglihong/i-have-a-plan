"""项目只读查询领域服务 (Domain Service)"""

from typing import Optional, List, Tuple
from app.domain.base import SortOrder
from app.domain.project.entities import Project, ProjectSortBy, ProjectStatus, ProjectType
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort

class ProjectQueryDomainService:
    """项目只读数据与明细查询领域服务"""

    def __init__(
        self,
        project_repo: ProjectRepositoryPort,
        task_repo: TaskRepositoryPort,
    ):
        self.project_repo = project_repo
        self.task_repo = task_repo

    async def list_projects(
        self,
        status: Optional[ProjectStatus] = None,
        project_type: Optional[ProjectType] = None,
        sort_by: ProjectSortBy = ProjectSortBy.UPDATED_AT,
        order: SortOrder = SortOrder.DESC,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Project], int]:
        projects, total = await self.project_repo.list_projects(
            status=status,
            project_type=project_type,
            sort_by=sort_by,
            order=order,
            page=page,
            size=size,
        )
        return projects, total

    async def get_project_detail(self, project_id: str) -> Project:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise KeyError(f"未找到项目: {project_id}")

        project.task_chains = await self.task_repo.get_task_chains_by_project_id(project_id)
        return project
    
    async def get_project(self, project_id: str) -> Optional[Project]:
        return await self.project_repo.get_by_id(project_id)

    async def get_recent_init_list(self, size: int = 100) -> List[Project]:
        """扫描所有 INIT 状态的半成品项目"""
        init_projects, total = await self.project_repo.list_projects(
            status=ProjectStatus.INIT,
            page=1,
            size=size,
        )
        return init_projects