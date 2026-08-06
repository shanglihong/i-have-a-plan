"""笔记领域状态写服务 (Domain State Service)"""

import logging
from typing import List, Optional
from app.domain.note.entities import MaterialNote, SynthesizedNote
from app.domain.note.factory import NoteMarkdownFactory
from app.domain.note.events import (
    MaterialNoteCreatedEvent,
    MaterialNoteUpdatedEvent,
    SynthesizedNoteCreatedEvent,
    MaterialNoteDeletedEvent,
)
from app.domain.note.ports import (
    MaterialNoteRepositoryPort,
    SynthesizedNoteRepositoryPort,
    NoteFileStoragePort,
)
from app.domain.events import EventPublisherPort

logger = logging.getLogger(__name__)


class NoteStateDomainService:
    def __init__(
        self, 
        material_repo: MaterialNoteRepositoryPort, 
        synthesized_repo: SynthesizedNoteRepositoryPort,
        file_storage_port: NoteFileStoragePort,
        event_publisher: EventPublisherPort,
    ):
        self.material_repo = material_repo
        self.synthesized_repo = synthesized_repo
        self.file_storage_port = file_storage_port
        self.event_publisher = event_publisher

    async def create_material_note(self, note: MaterialNote) -> None:
        await self.material_repo.save_material(note)
        event = MaterialNoteCreatedEvent(
            note_id=note.id,
            project_id=note.project_id,
            task_id=note.task_id or "",
            source_type=note.source_type.value
        )
        await self.event_publisher.publish(event)

    async def delete_material_note(self, note_id: str) -> None:
        await self.material_repo.delete_material(note_id)
        await self.event_publisher.publish(MaterialNoteDeletedEvent(note_id=note_id))

    async def update_material_note(
        self,
        note_id: str,
        user_interpretation: Optional[str] = None,
        context_reflection: Optional[str] = None
    ) -> Optional[MaterialNote]:
        note = await self.material_repo.find_material_by_id(note_id)
        if not note:
            return None

        if user_interpretation is not None:
            note.user_interpretation = user_interpretation
        if context_reflection is not None:
            note.context_reflection = context_reflection

        await self.material_repo.save_material(note)
        await self.event_publisher.publish(
            MaterialNoteUpdatedEvent(note_id=note.id, project_id=note.project_id)
        )
        return note


    async def create_synthesized_note(self, note: SynthesizedNote) -> None:
        md_content = NoteMarkdownFactory.compile_to_markdown(note.title, note.blocks)

        # 1. 原子写入 Markdown 文件
        await self.file_storage_port.write_markdown_file_atomic(note.file_path, md_content)

        # 2. DB 保存元数据与关系
        try:
            await self.synthesized_repo.save_synthesized(note)
        except Exception as e:
            # 事务失败，物理擦除已生成的 Markdown 文件以防留下孤立垃圾文件
            await self.file_storage_port.delete_markdown_file(note.file_path)
            logger.error(f"Failed to save synthesized note to DB, clean up file: {note.file_path}, error: {e}")
            raise e

        # 3. 广播事件
        event = SynthesizedNoteCreatedEvent(
            note_id=note.id,
            project_id=note.project_id,
            knowledge_base_id=note.knowledge_base_id,
            file_path=note.file_path
        )
        await self.event_publisher.publish(event)

    async def update_synthesized_note(self, note: SynthesizedNote) -> None:
        md_content = NoteMarkdownFactory.compile_to_markdown(note.title, note.blocks)

        # 1. 原子改写物理文件
        await self.file_storage_port.write_markdown_file_atomic(note.file_path, md_content)

        # 2. 保存 DB
        await self.synthesized_repo.save_synthesized(note)

    async def delete_synthesized_note(self, note_id: str) -> bool:
        note = await self.synthesized_repo.find_synthesized_by_id(note_id)
        if not note:
            return False

        # 1. 物理擦除磁盘 Markdown
        try:
            await self.file_storage_port.delete_markdown_file(note.file_path)
        except Exception as e:
            logger.error(f"Failed to delete markdown file: {note.file_path}, error: {e}")

        # 2. 清理数据库记录
        return await self.synthesized_repo.delete_synthesized(note_id)
