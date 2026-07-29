"""笔记高亮纠偏等具体业务操作领域服务 (Domain Service)"""

from app.domain.note.entities import SourceAnchor
from app.domain.note.ports import MaterialNoteRepositoryPort


class NoteOperationDomainService:
    """笔记具体业务操作领域服务"""

    def __init__(self, material_repo: MaterialNoteRepositoryPort):
        self.material_repo = material_repo

    async def correct_note_anchor(self, note_id: str, anchor: SourceAnchor) -> None:
        """纠正高亮坐标"""
        note = await self.material_repo.find_material_by_id(note_id)
        if not note:
            raise KeyError(f"未找到素材笔记: {note_id}")
        note.source_anchor = anchor
        await self.material_repo.save_material(note)
