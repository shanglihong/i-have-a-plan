"""素材笔记关联与直接撰写领域服务 (Domain Service)"""

from typing import List, Optional
from app.domain.project.entities import Task
from app.domain.project.ports import TaskRepositoryPort, NoteAttachmentRepositoryPort
from app.domain.project.exceptions import (
    TaskNotFoundException,
)

class TaskQueryDomainService:

    def __init__(self,task_repo: TaskRepositoryPort, note_attachment_repo: NoteAttachmentRepositoryPort):
        self.note_attachment_repo = note_attachment_repo
        self.task_repo = task_repo


    async def list_attached_note_ids(self, task_id: str) -> List[str]:
        """
        查询任务已挂载的所有笔记 ID 列表
        """
        task = await self.task_repo.find_task_by_id(task_id)
        if not task:
            raise TaskNotFoundException(task_id)
        return await self.note_attachment_repo.get_attached_note_ids_by_task(task_id)

    async def get_task(self, task_id: str) -> Optional[Task]:
        return await self.task_repo.get_task_by_id(task_id)