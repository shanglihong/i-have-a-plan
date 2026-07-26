"""READING 类型项目自愈修复策略模块"""

from typing import Optional
from app.domain.project.entities import Project, ProjectType
from app.domain.project.events import ProjectCreatedEvent
from app.infrastructure.event_bus.asyncio_event_bus import global_event_bus
from .base import BaseProjectHealer


class ReadingProjectHealer(BaseProjectHealer):
    """READING 类型项目自愈修复器 (场景 B)"""

    @property
    def target_type(self) -> ProjectType:
        return ProjectType.READING

    async def heal(self, project: Project) -> Optional[str]:
        if not project.book_id:
            return None

        # 模拟读取预解析 JSON 树
        default_toc = [
            {"id": "toc_c01", "title": "第一章 软件启动恢复修补", "target_chapter_id": "chap_01"}
        ]
        project.attach_toc_tree(default_toc, project.book_id)
        project.transit_to_active()
        await self.project_repo.save(project)
        await self.task_repo.save_task_chains(project.id, project.task_chains)

        # 广播事件
        event = ProjectCreatedEvent(
            project_id=project.id,
            project_type=project.project_type.value,
            status=project.status.value,
        )
        await global_event_bus.publish(event)
        return f"Project {project.id}: healed READING project to ACTIVE"
