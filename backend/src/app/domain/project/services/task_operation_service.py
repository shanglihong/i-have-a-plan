"""任务写操作与树挂载领域服务 (Domain Service)"""

from app.domain.project import TaskChain
import logging
from typing import Optional, List, Dict, Any

from app.domain.project.entities import Project, Task
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort, NoteAttachmentRepositoryPort
from app.domain.project.exceptions import TaskNotFoundException, DuplicateNoteAttachmentException

from app.domain.project.events import ProjectCreatedEvent, TaskTreeCreatedEvent
from app.domain.events import EventPublisherPort

logger = logging.getLogger(__name__)


class TaskOperationDomainService:
    """任务写操作与生成挂载领域服务"""

    def __init__(
        self,
        project_repo: ProjectRepositoryPort,
        task_repo: TaskRepositoryPort,
        note_attachment_repo: NoteAttachmentRepositoryPort,
        event_publisher: EventPublisherPort,
    ):
        self.project_repo = project_repo
        self.task_repo = task_repo
        self.note_attachment_repo = note_attachment_repo
        self.event_publisher = event_publisher

    async def mount_task_tree_and_activate(
        self,
        project_id: str,
        task_chains: List[TaskChain]
    ) -> Optional[Project]:
        """
        挂载领域任务树 (TaskChain 结构) 并扭转项目状态为 ACTIVE
        """
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            logger.warning(f"挂载任务树失败，未找到项目: project_id={project_id}")
            return None

        # 挂载结构化任务树并扭转项目状态为 ACTIVE
        project.attach_task_tree(task_chains)
        project.transit_to_active()

        # 持久化落盘
        await self.project_repo.save(project)
        if project.task_chains:
            await self.task_repo.save_task_chains(project.id, project.task_chains)

        # 全局广播项目就绪创建事件
        created_event = ProjectCreatedEvent(
            project_id=project.id,
            project_type=project.project_type.value,
            status=project.status.value,
        )
        await self.event_publisher.publish(created_event)
        await self.event_publisher.publish(TaskTreeCreatedEvent(project_id=project.id))

        logger.info(f"成功挂载任务树并激活项目: project_id={project_id}")
        return project


    async def attach_note(self, task_id: str, note_id: str) -> Task:
        task = await self.task_repo.find_task_by_id(task_id)
        if not task:
            raise TaskNotFoundException(task_id)

        note_ids = await self.note_attachment_repo.get_attached_note_ids_by_task(task_id)
        task.attached_note_ids = note_ids
        if note_id in note_ids:
            raise DuplicateNoteAttachmentException(task_id, note_id)

        _ = await self.note_attachment_repo.create_attachment_relation(task_id, note_id)
        return task


    async def detach_note(self, task_id: str, note_id: str) -> Task:
        task = await self.task_repo.find_task_by_id(task_id)
        if not task:
            raise TaskNotFoundException(task_id)

        note_ids = await self.note_attachment_repo.get_attached_note_ids_by_task(task_id)
        task.attached_note_ids = note_ids
        if note_id in note_ids:
            _ = await self.note_attachment_repo.remove_attachment_relation(task_id, note_id)
            task.attached_note_ids.remove(note_id)

        return task


    async def detach_notes(self, task_id: List[str]) -> None:
        """ 批量取消绑定 """
        await self.note_attachment_repo.remove_attachment_relation_by_tasks(task_id)
