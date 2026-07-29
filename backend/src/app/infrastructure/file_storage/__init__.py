"""本地物理文件存储 (parsed_content.json / MD File-first) 适配器包"""

from .book_storage import LocalBookFileStorageAdapter
from .note_storage import LocalNoteFileStorageAdapter

__all__ = ["LocalBookFileStorageAdapter", "LocalNoteFileStorageAdapter"]
