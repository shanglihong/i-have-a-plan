"""项目状态流转与更新领域服务 (Domain Service)"""

from datetime import datetime, timezone
from typing import Optional
import logging

from app.domain.events import EventPublisherPort
from app.domain.project.entities import Project, ProjectStatus
from app.domain.project.events import ProjectArchivedEvent, ProjectStatusChangedEvent
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
