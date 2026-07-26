"""图书文件自愈与损坏校验领域服务模块 (BookHealingDomainService)"""

import logging
from typing import List, Optional, Tuple
from app.domain.book.entities import Book, HealingStatus, ParsingStatus
from app.domain.book.ports import BookRepositoryPort, BookFileStoragePort
from app.domain.book.services.parsing_engine_service import BookParsingEngineService
from .base import BaseBookHealer
from .completed_healer import CompletedBookHealer
from .unparsed_healer import UnparsedBookHealer

logger = logging.getLogger(__name__)


class BookHealingDomainService:
    """图书文件自愈与损坏校验领域服务"""

    def __init__(
        self,
        repository: BookRepositoryPort,
        file_storage: BookFileStoragePort,
        parsing_engine: BookParsingEngineService,
        healers: Optional[List[BaseBookHealer]] = None,
    ):
        self.repository = repository
        self.file_storage = file_storage
        self.parsing_engine = parsing_engine

        self.completed_healer = CompletedBookHealer(repository, file_storage, parsing_engine)
        self.unparsed_healer = UnparsedBookHealer(repository, file_storage, parsing_engine)

    async def verify_and_heal_book(self, book_id: str) -> Tuple[HealingStatus, Optional[Book]]:
        """
        校验单个书籍的物理文件，若异常则尝试自动自愈修复
        Returns: (status_code, book_entity)
        """
        book = await self.repository.find_by_id(book_id)
        if not book:
            return HealingStatus.NOT_FOUND, None

        # 1. 检查原书物理文件是否存在
        raw_intact = await self.file_storage.check_file_hash_and_existence(book.storage_path)
        if not raw_intact:
            book.fail_parsing()
            await self.repository.save(book)
            await self.file_storage.delete_book_dir(book.storage_path)
            return HealingStatus.CORRUPTED, book

        # 2. 根据 parsing_status 路由至具体 Healer 策略
        if book.parsing_status == ParsingStatus.COMPLETED:
            return await self.completed_healer.heal(book)
        else:
            return await self.unparsed_healer.heal(book)

    async def batch_verify_and_heal_books(
        self,
        parsing_status: Optional[ParsingStatus] = None,
        page: int = 1,
        size: int = 100,
    ) -> Tuple[List[Tuple[str, HealingStatus]], int]:
        """
        先批量查出一批图书数据，逐个进行自愈校验与修补
        
        Returns:
            Tuple[List[Tuple[book_id, HealingStatus]], total_count]: (自愈结果清单, 总图书数)
        """
        books, total = await self.repository.list_books(
            parsing_status=parsing_status,
            page=page,
            size=size,
        )

        results: List[Tuple[str, HealingStatus]] = []
        for book in books:
            status, _ = await self.verify_and_heal_book(book.id)
            results.append((book.id, status))

        return results, total
