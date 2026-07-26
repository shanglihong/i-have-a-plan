"""PLAN 类型项目自愈修复策略模块"""

from typing import Optional
from app.domain.project.entities import Project, ProjectType
from app.domain.project.events import ProjectCreatedEvent
from app.infrastructure.event_bus.asyncio_event_bus import global_event_bus
from .base import BaseProjectHealer


class PlanProjectHealer(BaseProjectHealer):
    """PLAN 类型项目自愈修复器 (场景 C)"""

    @property
    def target_type(self) -> ProjectType:
        return ProjectType.PLAN

    async def heal(self, project: Project) -> Optional[str]:
        if not project.task_chains:
            return f"Project {project.id}: kept INIT for un-dialogued PLAN project"

        project.transit_to_active()
        await self.project_repo.save(project)
        event = ProjectCreatedEvent(
            project_id=project.id,
            project_type=project.project_type.value,
            status=project.status.value,
        )
        await global_event_bus.publish(event)
        return f"Project {project.id}: healed PLAN project to ACTIVE"
