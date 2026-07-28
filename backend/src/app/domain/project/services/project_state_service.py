"""项目状态流转与更新领域服务 (Domain Service)"""

from datetime import datetime, timezone
from typing import Optional
import logging

from app.domain.events import EventPublisherPort
from app.domain.project.factory import ProjectFactory
from app.domain.project.entities import Project
from app.domain.project.events import ProjectArchivedEvent, ProjectStatusChangedEvent, ProjectDeleteEvent
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort

logger = logging.getLogger(__name__)


class ProjectStateDomainService:
    """项目生命周期状态变迁与元数据落盘领域服务"""

    def __init__(
        self,
        project_repo: ProjectRepositoryPort,
        task_repo: TaskRepositoryPort,
        event_publisher: EventPublisherPort,
    ):
        self.project_repo = project_repo
        self.task_repo = task_repo
        self.event_publisher = event_publisher


    async def delete(self, project_id: str) -> None:
        await self.project_repo.delete(project_id)
        await self.event_publisher.publish(ProjectDeleteEvent(project_id=project_id))


    async def create_plan_project(
        self,
        title: str,
        deadline: Optional[datetime] = None,
        agent_id: Optional[str] = None,
    ) -> Project:
        # 1. 使用 Factory 构建 INIT 状态项目聚合根
        project = ProjectFactory.build_plan_project(title=title, deadline=deadline)

        # 2. Agent 句柄并绑定
        if agent_id:
            project.bind_agent(agent_id)

        # 3. 持久化到仓储
        await self.project_repo.save(project)
        if project.task_chains:
            await self.task_repo.save_task_chains(project.id, project.task_chains)

        return project


    async def create_reading_project(
        self,
        title: str,
        project_id: Optional[str] = None,
        deadline: Optional[datetime] = None,
        book_id: Optional[str] = None,
        agent_id: Optional[str] = None,
    ) -> Project:
        # 1. 使用 Factory 构建 INIT 状态项目聚合根
        project = ProjectFactory.build_reading_project(
            title=title,
            project_id=project_id,
            deadline=deadline,
            book_id=book_id,
        )

        # 2. Agent 句柄并绑定
        if agent_id:
            project.bind_agent(agent_id)

        # 3. 持久化到仓储
        await self.project_repo.save(project)
        if project.task_chains:
            await self.task_repo.save_task_chains(project.id, project.task_chains)

        return project


    async def update_metadata(
        self,
        project_id: str,
        title: Optional[str] = None,
        deadline: Optional[datetime] = None,
    ) -> Project:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise KeyError(f"未找到项目: {project_id}")

        if title is not None:
            project.title = title
        if deadline is not None:
            project.deadline = deadline

        project.updated_at = datetime.now(timezone.utc)
        await self.project_repo.save(project)
        return project


    async def archive_project(self, project_id: str) -> Project:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise KeyError(f"未找到项目: {project_id}")

        old_status = project.status.value
        project.archive()
        await self.project_repo.save(project)

        await self.event_publisher.publish(ProjectArchivedEvent(project_id=project.id))
        await self.event_publisher.publish(
            ProjectStatusChangedEvent(
                project_id=project.id,
                old_status=old_status,
                new_status=project.status.value,
            )
        )
        return project


    async def reactivate_project(self, project_id: str) -> Project:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise KeyError(f"未找到项目: {project_id}")

        old_status = project.status.value
        project.reactivate()
        await self.project_repo.save(project)

        await self.event_publisher.publish(
            ProjectStatusChangedEvent(
                project_id=project.id,
                old_status=old_status,
                new_status=project.status.value,
            )
        )
        return project
