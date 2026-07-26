"""书籍领域接口定义"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, Tuple
from app.domain.book.entities import Book, TocNode, ContentBlock, ParsingStatus


class BookRepositoryPort(ABC):
    """书籍仓储接口"""

    @abstractmethod
    async def save(self, book: Book) -> Book:
        """保存或更新书籍实体"""
        ...

    @abstractmethod
    async def find_by_id(self, book_id: str) -> Optional[Book]:
        """根据书籍 ID 查询书籍"""
        ...

    @abstractmethod
    async def find_by_project_id(self, project_id: str) -> Optional[Book]:
        """根据项目 ID 查询书籍"""
        ...

    @abstractmethod
    async def delete(self, book_id: str) -> bool:
        """删除书籍记录"""
        ...

    @abstractmethod
    async def list_books(
        self,
        parsing_status: Optional[ParsingStatus] = None,
        page: int = 1,
        size: int = 100,
    ) -> Tuple[List[Book], int]:
        """分页与条件查询书籍列表"""
        ...


class BookFileStoragePort(ABC):
    """书籍文件存储接口"""

    @abstractmethod
    async def save_parsed_content_json(self, storage_path: str, chapter_blocks_data: Dict[str, List[Dict[str, Any]]]) -> str:
        """
        原子落盘 parsed_content.json (.tmp -> SHA256 -> rename)
        Returns: content_json_path
        """
        ...

    @abstractmethod
    async def read_chapter_blocks(self, content_json_path: str, chapter_id: str) -> List[Dict[str, Any]]:
        """从磁盘读取指定章节的正文原子 ContentBlock 数组"""
        ...

    @abstractmethod
    async def read_all_parsed_content(self, content_json_path: str) -> Dict[str, List[Dict[str, Any]]]:
        """读取整书所有章节的 ContentBlock 字典"""
        ...

    @abstractmethod
    async def check_file_hash_and_existence(self, file_path: str) -> bool:
        """校验物理文件是否存在且文件正常"""
        ...

    @abstractmethod
    async def delete_book_dir(self, storage_path: str) -> None:
        """清理书籍存储目录"""
        ...

    @abstractmethod
    async def delete_parsed_content(self, target_path: str) -> None:
        ...