"""笔记与知识库领域服务模块"""

from typing import List
from app.domain.note.entities import MaterialNote, SynthesizedNote, SynthesizedNoteType


class NoteDomainService:
    """笔记合成领域计算服务"""

    @staticmethod
    def synthesize_notes(
        title: str,
        material_notes: List[MaterialNote],
        note_type: SynthesizedNoteType = SynthesizedNoteType.GENERAL
    ) -> SynthesizedNote:
        """素材卡片合成算法存根"""
        content = "\n\n".join([n.content for n in material_notes])
        return SynthesizedNote(
            title=title,
            content=content,
            note_type=note_type,
            source_material_ids=[n.id for n in material_notes]
        )
