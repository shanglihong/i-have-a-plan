"""笔记领域查询读服务 (Domain Query Service)"""

from typing import List, Optional
from app.domain.note.entities import MaterialNote, SynthesizedNote
from app.domain.note.ports import (
    MaterialNoteRepositoryPort,
    SynthesizedNoteRepositoryPort,
    INoteFileStoragePort,
)


class NoteQueryDomainService:
    """笔记查询领域服务"""

    def __init__(
        self,
        material_repo: MaterialNoteRepositoryPort,
        synthesized_repo: SynthesizedNoteRepositoryPort,
        file_storage_port: INoteFileStoragePort,
    ):
        self.material_repo = material_repo
        self.synthesized_repo = synthesized_repo
        self.file_storage_port = file_storage_port

    async def get_material_note_by_id(self, note_id: str) -> Optional[MaterialNote]:
        return await self.material_repo.find_by_id(note_id)

    async def list_material_notes_cursor(
        self,
        project_id: Optional[str],
        cursor: Optional[str],
        limit: int,
        keyword: Optional[str] = None
    ) -> List[MaterialNote]:
        return await self.material_repo.list_material_notes_cursor(
            project_id=project_id,
            cursor=cursor,
            limit=limit,
            keyword=keyword
        )

    async def get_synthesized_note_by_id(self, note_id: str) -> Optional[SynthesizedNote]:
        note = await self.synthesized_repo.find_by_id(note_id)
        if not note:
            return None
        try:
            md_content = await self.file_storage_port.read_markdown_file(note.file_path)
            from app.domain.note.factory import NoteMarkdownFactory
            note.blocks = NoteMarkdownFactory.parse_from_markdown(md_content)
        except Exception:
            note.blocks = []
        return note

    async def list_synthesized_notes_by_project(self, project_id: str) -> List[SynthesizedNote]:
        return await self.synthesized_repo.list_by_project(project_id)

    async def list_all_synthesized_notes(self) -> List[SynthesizedNote]:
        return await self.synthesized_repo.list_all_synthesized_notes()

    async def list_unpromoted_experience_notes(self) -> List[SynthesizedNote]:
        return await self.synthesized_repo.list_unpromoted_experience_notes()
