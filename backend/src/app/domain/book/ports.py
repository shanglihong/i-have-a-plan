"""书籍与物理锚点仓储接口模块"""

from abc import abstractmethod
from typing import Optional, List
from app.domain.common.ports import DomainPort
from app.domain.book.entities import Book, SourceAnchor


class BookRepositoryPort(DomainPort):
    """Book 仓储防腐接口"""

    @abstractmethod
    async def get_by_id(self, book_id: str) -> Optional[Book]:
        pass

    @abstractmethod
    async def save(self, book: Book) -> None:
        pass


class SourceAnchorRepositoryPort(DomainPort):
    """SourceAnchor 仓储防腐接口"""

    @abstractmethod
    async def save_anchor(self, anchor: SourceAnchor) -> None:
        pass
