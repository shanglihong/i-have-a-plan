"""NoteRepository 适配器实现模块"""

import base64
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, delete, and_, or_

from app.domain.note.entities import MaterialNote, SynthesizedNote, SourceAnchor, SourceType, SynthesizedNoteType, KnowledgeBase
from app.domain.note.ports import MaterialNoteRepositoryPort, SynthesizedNoteRepositoryPort, KnowledgeBaseRepositoryPort
from app.infrastructure.db.models.note import MaterialNoteDO, SynthesizedNoteDO, SynthesizedNoteMaterialRefDO, KnowledgeBaseDO
from app.utils.cursor import decode_cursor
from app.utils.snow import id_worker

logger = logging.getLogger(__name__)


class NoteRepositoryAdapter(MaterialNoteRepositoryPort, SynthesizedNoteRepositoryPort):
    def __init__(self, session: AsyncSession):
        self.session = session

    # ==========================================
    # 素材笔记 (MaterialNote) 实现
    # ==========================================

    async def save_material(self, note: MaterialNote) -> None:
        do = await self.session.get(MaterialNoteDO, note.id)
        
        anchor_json = None
        if note.source_anchor:
            anchor_json = json.dumps({
                "book_id": note.source_anchor.book_id,
                "chapter_id": note.source_anchor.chapter_id,
                "start_offset": note.source_anchor.start_offset,
                "end_offset": note.source_anchor.end_offset,
                "feature_text": note.source_anchor.feature_text
            }, ensure_ascii=False)

        created_at_utc = note.created_at.astimezone(timezone.utc).replace(tzinfo=None)
        updated_at_utc = note.updated_at.astimezone(timezone.utc).replace(tzinfo=None)

        if not do:
            do = MaterialNoteDO(
                id=note.id,
                project_id=note.project_id,
                task_id=note.task_id,
                source_type=note.source_type.value,
                raw_quote=note.raw_quote,
                user_interpretation=note.user_interpretation,
                context_reflection=note.context_reflection,
                anchor_json=anchor_json,
                discuss_message_id=note.discuss_message_id,
                tags=note.tags,
                created_at=created_at_utc,
                updated_at=updated_at_utc
            )
            self.session.add(do)
        else:
            do.project_id = note.project_id
            do.task_id = note.task_id
            do.source_type = note.source_type.value
            do.raw_quote = note.raw_quote
            do.user_interpretation = note.user_interpretation
            do.context_reflection = note.context_reflection
            do.anchor_json = anchor_json
            do.discuss_message_id = note.discuss_message_id
            do.tags = note.tags
            do.updated_at = updated_at_utc
            
        await self.session.commit()

    async def find_material_by_id(self, note_id: str) -> Optional[MaterialNote]:
        do = await self.session.get(MaterialNoteDO, note_id)
        if not do:
            return None
            
        anchor = None
        if do.anchor_json:
            try:
                data = json.loads(do.anchor_json)
                anchor = SourceAnchor(
                    book_id=data["book_id"],
                    chapter_id=data["chapter_id"],
                    start_offset=data["start_offset"],
                    end_offset=data["end_offset"],
                    feature_text=data["feature_text"]
                )
            except Exception as e:
                logger.warning(f"Error parsing anchor_json for note {note_id}: {e}")

        c_at = do.created_at.replace(tzinfo=timezone.utc)
        u_at = do.updated_at.replace(tzinfo=timezone.utc)

        note = MaterialNote(
            project_id=do.project_id,
            task_id=do.task_id,
            source_type=SourceType(do.source_type),
            raw_quote=do.raw_quote,
            user_interpretation=do.user_interpretation,
            context_reflection=do.context_reflection,
            source_anchor=anchor,
            discuss_message_id=do.discuss_message_id,
            tags=list(do.tags or [])
        )
        note.id = do.id
        note.created_at = c_at
        note.updated_at = u_at
        return note

    async def find_material_by_ids(self, note_ids: List[str]) -> List[MaterialNote]:
        if not note_ids:
            return []

        stmt = select(MaterialNoteDO).where(MaterialNoteDO.id.in_(note_ids))
        result = await self.session.execute(stmt)
        dos = result.scalars().all()

        notes = []
        for do in dos:
            anchor = None
            if do.anchor_json:
                try:
                    data = json.loads(do.anchor_json)
                    anchor = SourceAnchor(
                        book_id=data["book_id"],
                        chapter_id=data["chapter_id"],
                        start_offset=data["start_offset"],
                        end_offset=data["end_offset"],
                        feature_text=data["feature_text"]
                    )
                except Exception as e:
                    logger.warning(f"Error parsing anchor_json for note {do.id}: {e}")

            c_at = do.created_at.replace(tzinfo=timezone.utc)
            u_at = do.updated_at.replace(tzinfo=timezone.utc)

            note = MaterialNote(
                project_id=do.project_id,
                task_id=do.task_id,
                source_type=SourceType(do.source_type),
                raw_quote=do.raw_quote,
                user_interpretation=do.user_interpretation,
                context_reflection=do.context_reflection,
                source_anchor=anchor,
                discuss_message_id=do.discuss_message_id,
                tags=list(do.tags or [])
            )
            note.id = do.id
            note.created_at = c_at
            note.updated_at = u_at
            notes.append(note)

        return notes

    async def list_material_notes_cursor(
        self,
        project_id: Optional[str],
        cursor: Optional[str],
        limit: int,
        keyword: Optional[str] = None
    ) -> List[MaterialNote]:
        stmt = select(MaterialNoteDO)
        
        if project_id:
            stmt = stmt.where(MaterialNoteDO.project_id == project_id)
            
        if keyword:
            kw = f"%{keyword}%"
            stmt = stmt.where(
                or_(
                    MaterialNoteDO.user_interpretation.like(kw),
                    MaterialNoteDO.raw_quote.like(kw),
                    MaterialNoteDO.context_reflection.like(kw)
                )
            )

        if cursor:
            ts, cursor_id = decode_cursor(cursor)
            if ts > 0:
                cursor_dt = datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)
                stmt = stmt.where(
                    or_(
                        MaterialNoteDO.created_at < cursor_dt,
                        and_(
                            MaterialNoteDO.created_at == cursor_dt,
                            MaterialNoteDO.id < cursor_id
                        )
                    )
                )
                
        stmt = stmt.order_by(MaterialNoteDO.created_at.desc(), MaterialNoteDO.id.desc()).limit(limit)
        
        result = await self.session.execute(stmt)
        dos = result.scalars().all()
        
        notes = []
        for do in dos:
            anchor = None
            if do.anchor_json:
                try:
                    data = json.loads(do.anchor_json)
                    anchor = SourceAnchor(
                        book_id=data["book_id"],
                        chapter_id=data["chapter_id"],
                        start_offset=data["start_offset"],
                        end_offset=data["end_offset"],
                        feature_text=data["feature_text"]
                    )
                except Exception:
                    pass
            
            note = MaterialNote(
                project_id=do.project_id,
                task_id=do.task_id,
                source_type=SourceType(do.source_type),
                raw_quote=do.raw_quote,
                user_interpretation=do.user_interpretation,
                context_reflection=do.context_reflection,
                source_anchor=anchor,
                discuss_message_id=do.discuss_message_id,
                tags=list(do.tags or [])
            )
            note.id = do.id
            note.created_at = do.created_at.replace(tzinfo=timezone.utc)
            note.updated_at = do.updated_at.replace(tzinfo=timezone.utc)
            notes.append(note)
            
        return notes

    async def delete_material(self, note_id: str) -> bool:
        stmt = delete(MaterialNoteDO).where(MaterialNoteDO.id == note_id)
        await self.session.execute(stmt)
        stmt_ref = delete(SynthesizedNoteMaterialRefDO).where(SynthesizedNoteMaterialRefDO.material_note_id == note_id)
        await self.session.execute(stmt_ref)
        await self.session.commit()
        return True

    # ==========================================
    # 沉淀笔记 (SynthesizedNote) 的私有持久化实现
    # ==========================================

    async def save_synthesized(self, note: SynthesizedNote) -> None:
        do = await self.session.get(SynthesizedNoteDO, note.id)
        
        created_at_utc = note.created_at.astimezone(timezone.utc).replace(tzinfo=None)
        updated_at_utc = note.updated_at.astimezone(timezone.utc).replace(tzinfo=None)

        if not do:
            do = SynthesizedNoteDO(
                id=note.id,
                project_id=note.project_id,
                knowledge_base_id=note.knowledge_base_id,
                title=note.title,
                note_type=note.note_type.value,
                file_path=note.file_path,
                summary=note.summary,
                created_at=created_at_utc,
                updated_at=updated_at_utc
            )
            self.session.add(do)
        else:
            do.project_id = note.project_id
            do.knowledge_base_id = note.knowledge_base_id
            do.title = note.title
            do.note_type = note.note_type.value
            do.file_path = note.file_path
            do.summary = note.summary
            do.updated_at = updated_at_utc
            
        # 清除原有的多对多关联
        stmt_del = delete(SynthesizedNoteMaterialRefDO).where(SynthesizedNoteMaterialRefDO.synthesized_note_id == note.id)
        await self.session.execute(stmt_del)
        
        referenced_ids = note.get_referenced_material_ids()
                
        for mat_id in referenced_ids:
            ref_do = SynthesizedNoteMaterialRefDO(
                id=f"ref_{id_worker.next_id_str()}",
                synthesized_note_id=note.id,
                material_note_id=mat_id
            )
            self.session.add(ref_do)
            
        await self.session.commit()

    async def find_synthesized_by_id(self, note_id: str) -> Optional[SynthesizedNote]:
        do = await self.session.get(SynthesizedNoteDO, note_id)
        if not do:
            return None
            
        c_at = do.created_at.replace(tzinfo=timezone.utc)
        u_at = do.updated_at.replace(tzinfo=timezone.utc)
        
        note = SynthesizedNote(
            project_id=do.project_id,
            knowledge_base_id=do.knowledge_base_id,
            title=do.title,
            note_type=SynthesizedNoteType(do.note_type),
            file_path=do.file_path,
            summary=do.summary
        )
        note.id = do.id
        note.created_at = c_at
        note.updated_at = u_at
        return note

    async def list_by_project(self, project_id: str) -> List[SynthesizedNote]:
        stmt = select(SynthesizedNoteDO).where(SynthesizedNoteDO.project_id == project_id)
        result = await self.session.execute(stmt)
        dos = result.scalars().all()
        
        notes = []
        for do in dos:
            note = SynthesizedNote(
                project_id=do.project_id,
                knowledge_base_id=do.knowledge_base_id,
                title=do.title,
                note_type=SynthesizedNoteType(do.note_type),
                file_path=do.file_path,
                summary=do.summary
            )
            note.id = do.id
            note.created_at = do.created_at.replace(tzinfo=timezone.utc)
            note.updated_at = do.updated_at.replace(tzinfo=timezone.utc)
            notes.append(note)
        return notes

    async def delete_synthesized(self, note_id: str) -> bool:
        stmt = delete(SynthesizedNoteDO).where(SynthesizedNoteDO.id == note_id)
        await self.session.execute(stmt)
        stmt_ref = delete(SynthesizedNoteMaterialRefDO).where(SynthesizedNoteMaterialRefDO.synthesized_note_id == note_id)
        await self.session.execute(stmt_ref)
        await self.session.commit()
        return True

    async def clear_knowledge_base_id_batch(self, kb_id: str) -> None:
        stmt = select(SynthesizedNoteDO).where(SynthesizedNoteDO.knowledge_base_id == kb_id)
        result = await self.session.execute(stmt)
        dos = result.scalars().all()
        for do in dos:
            do.knowledge_base_id = None
        await self.session.commit()

    async def list_unpromoted_experience_notes(self) -> List[SynthesizedNote]:
        stmt = select(SynthesizedNoteDO).where(SynthesizedNoteDO.note_type == SynthesizedNoteType.EXPERIENCE.value)
        result = await self.session.execute(stmt)
        dos = result.scalars().all()
        
        notes = []
        for do in dos:
            note = SynthesizedNote(
                project_id=do.project_id,
                knowledge_base_id=do.knowledge_base_id,
                title=do.title,
                note_type=SynthesizedNoteType.EXPERIENCE,
                file_path=do.file_path,
                summary=do.summary
            )
            note.id = do.id
            note.created_at = do.created_at.replace(tzinfo=timezone.utc)
            note.updated_at = do.updated_at.replace(tzinfo=timezone.utc)
            notes.append(note)
        return notes



    async def list_all_synthesized_notes(self) -> List[SynthesizedNote]:
        stmt = select(SynthesizedNoteDO)
        result = await self.session.execute(stmt)
        dos = result.scalars().all()
        notes = []
        for do in dos:
            note = SynthesizedNote(
                project_id=do.project_id,
                knowledge_base_id=do.knowledge_base_id,
                title=do.title,
                note_type=SynthesizedNoteType(do.note_type),
                file_path=do.file_path,
                summary=do.summary
            )
            note.id = do.id
            note.created_at = do.created_at.replace(tzinfo=timezone.utc)
            note.updated_at = do.updated_at.replace(tzinfo=timezone.utc)
            notes.append(note)
        return notes

    async def find_by_kb_id(self, kb_id: str) -> List[SynthesizedNote]:
        stmt = select(SynthesizedNoteDO).where(SynthesizedNoteDO.knowledge_base_id == kb_id)
        result = await self.session.execute(stmt)
        dos = result.scalars().all()
        notes = []
        for do in dos:
            note = SynthesizedNote(
                project_id=do.project_id,
                knowledge_base_id=do.knowledge_base_id,
                title=do.title,
                note_type=SynthesizedNoteType(do.note_type),
                file_path=do.file_path,
                summary=do.summary
            )
            note.id = do.id
            note.created_at = do.created_at.replace(tzinfo=timezone.utc)
            note.updated_at = do.updated_at.replace(tzinfo=timezone.utc)
            notes.append(note)
        return notes

    # ==========================================
    # 知识库 (KnowledgeBase) 的私有持久化实现
    # ==========================================

    async def save_knowledge_base(self, kb: KnowledgeBase) -> None:
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

    async def find_knowledge_base_by_id(self, kb_id: str) -> Optional[KnowledgeBase]:
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

    async def delete_knowledge_base(self, kb_id: str) -> bool:
        do = await self.session.get(KnowledgeBaseDO, kb_id)
        if not do:
            return False
        await self.session.delete(do)
        await self.session.commit()
        return True
