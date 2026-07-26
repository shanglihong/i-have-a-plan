"""ProjectRepository 实现模块 (仅专注 Project 项目元数据表存储)"""

from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.domain.base import SortOrder
from app.domain.project.entities import Project, ProjectSortBy, ProjectType, ProjectStatus
from app.domain.project.ports import ProjectRepositoryPort
from app.infrastructure.db.models.project import ProjectDO


class ProjectRepository(ProjectRepositoryPort):
    """基于 AsyncSession 的 SQLite 项目元数据仓储实现"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, project_id: str) -> Optional[Project]:
        stmt = select(ProjectDO).where(ProjectDO.id == project_id)
        res = await self.session.execute(stmt)
        project_do = res.scalar_one_or_none()
        if not project_do:
            return None

        return Project(
            id=project_do.id,
            title=project_do.title,
            description=project_do.description,
            project_type=ProjectType(project_do.project_type),
            status=ProjectStatus(project_do.status),
            assigned_agent_id=project_do.assigned_agent_id,
            deadline=project_do.deadline,
            book_id=project_do.book_id,
            tags=list(project_do.tags or []),
            task_chains=[],  # 存储层解耦：TaskChain 由 TaskRepository 独立拉取拼装
            created_at=project_do.created_at,
            updated_at=project_do.updated_at,
        )

    async def save(self, project: Project) -> None:
        stmt = select(ProjectDO).where(ProjectDO.id == project.id)
        res = await self.session.execute(stmt)
        project_do = res.scalar_one_or_none()

        if not project_do:
            project_do = ProjectDO(
                id=project.id,
                title=project.title,
                description=project.description,
                project_type=project.project_type.value,
                status=project.status.value,
                assigned_agent_id=project.assigned_agent_id,
                deadline=project.deadline,
                book_id=project.book_id,
                tags=project.tags,
                created_at=project.created_at,
                updated_at=project.updated_at,
            )
            self.session.add(project_do)
        else:
            project_do.title = project.title
            project_do.description = project.description
            project_do.project_type = project.project_type.value
            project_do.status = project.status.value
            project_do.assigned_agent_id = project.assigned_agent_id
            project_do.deadline = project.deadline
            project_do.book_id = project.book_id
            project_do.tags = project.tags
            project_do.updated_at = project.updated_at

        await self.session.commit()

    async def list_projects(
        self,
        status: Optional[ProjectStatus] = None,
        project_type: Optional[ProjectType] = None,
        sort_by: ProjectSortBy = ProjectSortBy.UPDATED_AT,
        order: SortOrder = SortOrder.DESC,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Project], int]:
        stmt = select(ProjectDO)
        count_stmt = select(func.count(ProjectDO.id))

        if status:
            stmt = stmt.where(ProjectDO.status == status.value)
            count_stmt = count_stmt.where(ProjectDO.status == status.value)
        if project_type:
            stmt = stmt.where(ProjectDO.project_type == project_type.value)
            count_stmt = count_stmt.where(ProjectDO.project_type == project_type.value)

        sort_key = sort_by.value if isinstance(sort_by, ProjectSortBy) else str(sort_by)
        order_val = order.value if isinstance(order, SortOrder) else str(order)

        order_column = getattr(ProjectDO, sort_key, ProjectDO.updated_at)
        if order_val.lower() == SortOrder.DESC.value:
            stmt = stmt.order_by(order_column.desc())
        else:
            stmt = stmt.order_by(order_column.asc())

        offset = (page - 1) * size
        stmt = stmt.offset(offset).limit(size)

        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar() or 0

        res = await self.session.execute(stmt)
        project_dos = res.scalars().all()

        projects = [
            Project(
                id=pdo.id,
                title=pdo.title,
                description=pdo.description,
                project_type=ProjectType(pdo.project_type),
                status=ProjectStatus(pdo.status),
                assigned_agent_id=pdo.assigned_agent_id,
                deadline=pdo.deadline,
                book_id=pdo.book_id,
                tags=list(pdo.tags or []),
                task_chains=[],
                created_at=pdo.created_at,
                updated_at=pdo.updated_at,
            )
            for pdo in project_dos
        ]

        return projects, total

    async def delete(self, project_id: str) -> bool:
        project_do = await self.session.get(ProjectDO, project_id)
        if not project_do:
            return False

        await self.session.delete(project_do)
        await self.session.commit()
        return True
