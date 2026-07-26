"""未完成/失败解析图书的重解析自愈策略"""

from typing import Optional, Tuple
from app.domain.book.entities import Book, HealingStatus, ParsingStatus
from .base import BaseBookHealer


class UnparsedBookHealer(BaseBookHealer):
    """PENDING / PARSING / FAILED 状态图书的重解析修复器"""

    @property
    def target_status(self) -> Optional[ParsingStatus]:
        return None  # 匹配通用/非 COMPLETED 状态

    async def heal(self, book: Book) -> Tuple[HealingStatus, Optional[Book]]:
        try:
            healed_book = await self.parsing_engine.parse_book(book.id)
            return HealingStatus.HEALED_REPARSING, healed_book
        except Exception:
            book.fail_parsing()
            await self.repository.save(book)
            return HealingStatus.CORRUPTED, book
