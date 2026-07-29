"""笔记物理文件存储适配器 (File-first 原子落盘与读取)"""

import os
import shutil
import logging
from pathlib import Path
from typing import List
from app.domain.note.ports import NoteFileStoragePort
from app.utils.path import get_workspace_dir

logger = logging.getLogger(__name__)


class LocalNoteFileStorageAdapter(NoteFileStoragePort):
    """基于本地文件系统的笔记 Markdown 文件存储适配器"""

    async def write_markdown_file_atomic(self, file_path: str, content: str) -> str:
        dest_path = Path(file_path)
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        # 1. 建立临时文件
        tmp_path = dest_path.with_suffix(dest_path.suffix + f".{os.getpid()}.tmp")
        
        try:
            # 2. 写入临时文件
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(content)
                f.flush()
                os.fsync(f.fileno())
                
            # 3. 原子替换重命名
            os.replace(tmp_path, dest_path)
        except Exception as e:
            if tmp_path.exists():
                tmp_path.unlink()
            logger.error(f"Failed to write markdown file atomic: {file_path}, error: {e}")
            raise IOError(f"原子写 Markdown 物理磁盘失败: {e}") from e
            
        return file_path

    async def read_markdown_file(self, file_path: str) -> str:
        phys_path = Path(file_path)
        if not phys_path.exists():
            raise FileNotFoundError(f"笔记文件未找到: {file_path}")
            
        with open(phys_path, "r", encoding="utf-8") as f:
            return f.read()

    async def delete_markdown_file(self, file_path: str) -> None:
        phys_path = Path(file_path)
        if phys_path.exists():
            phys_path.unlink()


    async def scan_all_physical_files(self, notes_dir: Path) -> List[str]:
        notes_dir = Path(notes_dir)
        relative_paths = []
        for file in notes_dir.glob("*.md"):
            if file.is_file():
                rel_path = f"data/notes/{file.name}"
                relative_paths.append(rel_path)
        return relative_paths

    async def clean_temporary_files(self, notes_dir: Path) -> List[str]:
        notes_dir = Path(notes_dir)
        cleaned_files = []
        # 扫描并清理所有以 .tmp 结尾的垃圾临时文件
        for file in notes_dir.glob("*.tmp"):
            if file.is_file():
                try:
                    file.unlink()
                    cleaned_files.append(str(file))
                except Exception as e:
                    logger.warning(f"Failed to clean temporary file {file}: {e}")
        return cleaned_files