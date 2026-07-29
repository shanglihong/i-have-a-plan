from typing import List
from app.container import AppContainer
from app.domain.book.entities import HealingStatus, Book
import logging

logger = logging.getLogger(__name__)

class BookHealing:
    def __init__(self, container: AppContainer):
        self.container = container

    async def handle(self) -> None:
        books: List[Book] = []
        pending_list = await self.container.book_service.get_pending_list()
        parsing_list = await self.container.book_service.get_parsing_list()
        books.extend(pending_list)
        books.extend(parsing_list)
        
        logger.info(f"图书冷启动物理自愈校验启动，待处理图书: {len(books)}")

        for book in books:
            await self.container.parsing_engine.fix_book(book)