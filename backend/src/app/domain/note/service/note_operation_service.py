"""笔记高亮纠偏等具体业务操作领域服务 (Domain Service)"""
import logging

from typing import List, Tuple
from app.domain.note.entities import SourceAnchor
from app.domain.note.ports import MaterialNoteRepositoryPort, SynthesizedNoteRepositoryPort, NoteFileStoragePort
from app.utils.path import get_note_dir

class NoteOperationDomainService:
    """笔记具体业务操作领域服务"""

    def __init__(
            self,
            material_repo: MaterialNoteRepositoryPort,
            file_storage_port: NoteFileStoragePort,
            synthesized_repo: SynthesizedNoteRepositoryPort,
    ):
        self.material_repo = material_repo
        self.file_storage_port = file_storage_port
        self.synthesized_repo = synthesized_repo

    async def correct_note_anchor(self, note_id: str, anchor: SourceAnchor) -> None:
        """纠正高亮坐标"""
        note = await self.material_repo.find_material_by_id(note_id)
        if not note:
            raise KeyError(f"未找到素材笔记: {note_id}")
        note.source_anchor = anchor
        await self.material_repo.save_material(note)


    async def clean_orphaned_files(self) -> Tuple[List[str], List[str]]:
        """清理笔记异常遗留的孤儿文件"""

        # 1. 清理中断强杀留下的 .md.tmp 脏临时文件
        cleaned_tmp = await self.file_storage_port.clean_temporary_files(get_note_dir())

        # 2. 清理未在 DB 注册 of 孤岛离线物理 Markdown 垃圾文件
        physical_files = await self.file_storage_port.scan_all_physical_files(get_note_dir())
        registered_notes = await self.synthesized_repo.list_all_synthesized_notes()

        # 路径比对
        cleaned_md_files = []
        registered_paths = {n.file_path for n in registered_notes}
        for path in physical_files:
            if path not in registered_paths:
                await self.file_storage_port.delete_markdown_file(path)
                cleaned_md_files.append(path)

        return cleaned_tmp, cleaned_md_files