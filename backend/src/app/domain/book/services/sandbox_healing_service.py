"""沙箱自愈与损坏校验服务"""

import logging
from typing import Optional, Tuple
from app.domain.book.entities import Book, ParsingStatus, HealingStatus
from app.domain.book.ports import BookRepositoryPort, BookFileStoragePort
from app.domain.book.services.parsing_engine_service import BookParsingEngineService

logger = logging.getLogger(__name__)


class BookSandboxHealingService:
    """沙箱自愈与损坏校验服务"""

    def __init__(
        self,
        repository: BookRepositoryPort,
        file_storage: BookFileStoragePort,
        parsing_engine: BookParsingEngineService
    ):
        self.repository = repository
        self.file_storage = file_storage
        self.parsing_engine = parsing_engine

    async def verify_and_heal_book(self, book_id: str) -> Tuple[HealingStatus, Optional[Book]]:
        """
        校验单个书籍的物理沙箱，若异常则尝试自动自愈修复
        Returns: (status_code, book_entity)
            status_code: HealingStatus
        """
        book = await self.repository.find_by_id(book_id)
        if not book:
            return HealingStatus.NOT_FOUND, None

        # 检查原书物理文件是否存在
        raw_intact = await self.file_storage.check_file_hash_and_existence(book.storage_path)
        if not raw_intact:
            book.fail_parsing()
            await self.repository.save(book)
            await self.file_storage.delete_book_sandbox_dir(book.storage_path)
            return HealingStatus.CORRUPTED, book

        # 原书完好，校验解析 JSON 文件
        if book.parsing_status == ParsingStatus.COMPLETED:
            json_intact = await self.file_storage.check_file_hash_and_existence(book.content_json_path)
            if json_intact:
                return HealingStatus.INTACT, book
            else:
                logger.warning(f"检测到 parsed_content.json 丢失，自动触发重新解析自愈: book_id={book_id}")
                healed_book = await self.parsing_engine.parse_book(book_id)
                return HealingStatus.HEALED_REPARSING, healed_book
        elif book.parsing_status in [ParsingStatus.PARSING, ParsingStatus.PENDING, ParsingStatus.FAILED]:
            try:
                healed_book = await self.parsing_engine.parse_book(book_id)
                return HealingStatus.HEALED_REPARSING, healed_book
            except Exception:
                return HealingStatus.CORRUPTED, book

        return HealingStatus.INTACT, book
