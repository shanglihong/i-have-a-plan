"""已完成解析图书的物理文件校验与自愈策略"""

import logging
from typing import Optional, Tuple
from app.domain.book.entities import Book, HealingStatus, ParsingStatus
from .base import BaseBookHealer

logger = logging.getLogger(__name__)


class CompletedBookHealer(BaseBookHealer):
    """ParsingStatus.COMPLETED 状态图书的自愈修复器"""

    @property
    def target_status(self) -> Optional[ParsingStatus]:
        return ParsingStatus.COMPLETED

    async def heal(self, book: Book) -> Tuple[HealingStatus, Optional[Book]]:
        # 检查 parsed_content.json 物理文件
        json_intact = await self.file_storage.check_file_hash_and_existence(book.content_json_path)
        if json_intact:
            return HealingStatus.INTACT, book

        logger.warning(f"检测到 parsed_content.json 丢失，自动触发重新解析自愈: book_id={book.id}")
        try:
            healed_book = await self.parsing_engine.parse_book(book.id)
            return HealingStatus.HEALED_REPARSING, healed_book
        except Exception:
            book.fail_parsing()
            await self.repository.save(book)
            return HealingStatus.CORRUPTED, book
