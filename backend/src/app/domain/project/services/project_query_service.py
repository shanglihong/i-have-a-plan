"""项目只读查询领域服务 (Domain Service)"""

from typing import Optional, List, Tuple
from app.domain.base import SortOrder
from app.domain.project.entities import Project, ProjectSortBy, ProjectStatus, ProjectType
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort
from app.domain.book.ports import BookRepositoryPort


class ProjectQueryDomainService:
    """项目只读数据与明细查询领域服务"""

    def __init__(
        self,
        project_repo: ProjectRepositoryPort,
        task_repo: TaskRepositoryPort,
        book_repo: BookRepositoryPort,
    ):
        self.project_repo = project_repo
        self.task_repo = task_repo
        self.book_repo = book_repo

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

        # 若是 READING 阅读类型项目，自动填充 Book 关联实体
        if project.project_type == ProjectType.READING:
            if project.book_id:
                project.book = await self.book_repo.find_by_id(project.book_id)
            else:
                project.book = await self.book_repo.find_by_project_id(project_id)

        return project
