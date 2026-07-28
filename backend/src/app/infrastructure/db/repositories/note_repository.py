"""NoteRepository 适配器实现模块"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, delete

from app.domain.note.entities import MaterialNote
from app.domain.note.ports import NoteRepositoryPort
from app.infrastructure.db.models.note import MaterialNoteDO


class NoteRepositoryAdapter(NoteRepositoryPort):
    """基于 AsyncSession 的 SQLite 笔记仓储实现"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_material_note(self, note_id: str) -> Optional[MaterialNote]:
        do = await self.session.get(MaterialNoteDO, note_id)
        if not do:
            return None
        return MaterialNote(
            id=do.id,
            anchor_id=do.anchor_id,
            task_id=do.task_id,
            content=do.content,
            tags=list(do.tags or []),
            created_at=do.created_at,
            updated_at=do.updated_at
        )

    async def save_material_note(self, note: MaterialNote) -> None:
        do = await self.session.get(MaterialNoteDO, note.id)
        if not do:
            do = MaterialNoteDO(
                id=note.id,
                anchor_id=note.anchor_id,
                task_id=note.task_id,
                content=note.content,
                tags=note.tags,
                created_at=note.created_at,
                updated_at=note.updated_at
            )
            self.session.add(do)
        else:
            do.anchor_id = note.anchor_id
            do.task_id = note.task_id
            do.content = note.content
            do.tags = note.tags
            do.updated_at = note.updated_at
        await self.session.commit()

    async def save_synthesized_note(self, note) -> None:
        pass
