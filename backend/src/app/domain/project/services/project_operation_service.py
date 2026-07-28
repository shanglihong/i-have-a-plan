"""归档项目经验笔记与复盘里程碑生成领域服务 (Domain Service)"""

from typing import Tuple, Optional

from app.domain.events import EventPublisherPort
from app.domain.project import ExperienceNoteCreatedEvent
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort


class ExperienceNoteDomainService:
    """归档卡片生成经验笔记/挂载复盘里程碑领域服务"""
    def __init__(
        self,
        repository: ProjectRepositoryPort,
        task_repository: TaskRepositoryPort,
        event_publisher: EventPublisherPort,
    ):
        self.repository = repository
        self.task_repository = task_repository
        self.event_publisher = event_publisher

    async def create_experience_note(
        self,
        project_id: str,
        content: str = "",
        title: str = "项目复盘",
    ) -> Tuple[str, str]:
        """给指定项目挂上一个复盘里程碑 (RETROSPECTIVE TaskChain)"""
        project = await self.repository.get_by_id(project_id)
        if not project:
            raise KeyError(f"未找到项目: {project_id}")

        if self.task_repository:
            existing_chains = await self.task_repository.get_task_chains_by_project_id(project_id)
            project.task_chains = existing_chains

        retro_chain = project.add_retrospective_milestone(title=title, description=content)

        if self.task_repository:
            await self.task_repository.save_task_chains(project_id, project.task_chains)

        await self.repository.save(project)
        await self.event_publisher.publish(ExperienceNoteCreatedEvent(project_id=project_id, task_chain_id=retro_chain.id))
        
        return project.id, retro_chain.id

