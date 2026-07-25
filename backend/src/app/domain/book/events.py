"""书籍领域事件定义模块"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.domain.book.entities import Book


@dataclass
class BookParseRequestedEvent:
    """电子书解析请求事件"""
    project_id: str
    file_name: str
    file_path: str
    book_id: Optional[str] = None


@dataclass
class BookParsedEvent:
    """电子书解析完成事件"""
    book_id: str
    project_id: str
    toc_tree: List[Dict[str, Any]]
    total_chapters: int
    total_words: int

    @classmethod
    def from_book(cls, book: "Book") -> "BookParsedEvent":
        """基于已完成解析的 Book 实体快捷组装解析完成事件"""
        return cls(
            book_id=book.id,
            project_id=book.project_id,
            toc_tree=book.parsed_structure or [],
            total_chapters=book.total_chapters,
            total_words=book.total_word_count
        )


@dataclass
class BookDeletedEvent:
    """电子书删除事件"""
    book_id: str
    project_id: str
