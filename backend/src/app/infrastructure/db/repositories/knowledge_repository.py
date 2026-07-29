"""NoteRepository 适配器实现模块"""

import logging
from datetime import timezone
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, delete, and_, or_

from app.domain.note.entities import KnowledgeBase
from app.domain.note.ports import KnowledgeBaseRepositoryPort
from app.infrastructure.db.models.note import KnowledgeBaseDO

logger = logging.getLogger(__name__)


class KnowledgeRepository(KnowledgeBaseRepositoryPort):
    """基于 AsyncSession 的 SQLite 笔记与沉淀笔记复合仓储适配器"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def save(self, kb: KnowledgeBase) -> None:
        do = await self.session.get(KnowledgeBaseDO, kb.id)
        created_at_utc = kb.created_at.astimezone(timezone.utc).replace(tzinfo=None)
        updated_at_utc = kb.updated_at.astimezone(timezone.utc).replace(tzinfo=None)

        if not do:
            do = KnowledgeBaseDO(
                id=kb.id,
                title=kb.title,
                description=kb.description,
                created_at=created_at_utc,
                updated_at=updated_at_utc
            )
            self.session.add(do)
        else:
            do.title = kb.title
            do.description = kb.description
            do.updated_at = updated_at_utc
            
        await self.session.commit()

    async def find_by_id(self, kb_id: str) -> Optional[KnowledgeBase]:
        do = await self.session.get(KnowledgeBaseDO, kb_id)
        if not do:
            return None
        
        kb = KnowledgeBase(
            title=do.title,
            description=do.description
        )
        kb.id = do.id
        kb.created_at = do.created_at.replace(tzinfo=timezone.utc)
        kb.updated_at = do.updated_at.replace(tzinfo=timezone.utc)
        return kb

    async def list_all(self) -> List[KnowledgeBase]:
        stmt = select(KnowledgeBaseDO)
        result = await self.session.execute(stmt)
        dos = result.scalars().all()
        kbs = []
        for do in dos:
            kb = KnowledgeBase(
                title=do.title,
                description=do.description
            )
            kb.id = do.id
            kb.created_at = do.created_at.replace(tzinfo=timezone.utc)
            kb.updated_at = do.updated_at.replace(tzinfo=timezone.utc)
            kbs.append(kb)
        return kbs

    async def delete(self, kb_id: str) -> bool:
        do = await self.session.get(KnowledgeBaseDO, kb_id)
        if not do:
            return False
        await self.session.delete(do)
        await self.session.commit()
        return True
