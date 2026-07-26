"""书籍创建领域服务 (Domain Service)"""

import uuid
from typing import Optional
from app.domain.book.entities import Book, BookFileType, ParsingStatus
from app.domain.events import EventPublisherPort
from app.domain.book.ports import BookRepositoryPort
from app.domain.book.exceptions import UnsupportedBookFormatException
from app.domain.book.events import BookCreatedEvent


class BookCreationDomainService:
    """解析前的书籍记录创建领域服务"""

    def __init__(
        self,
        repository: BookRepositoryPort,
        event_publisher: EventPublisherPort,
    ):
        self.repository = repository
        self.event_publisher = event_publisher

    async def create_book(
        self,
        project_id: str,
        file_name: str,
        file_type: str,
        file_size: int = 0,
        storage_path: str = "",
        book_id: Optional[str] = None
    ) -> Book:
        ext = file_type.upper()
        if ext not in BookFileType.__members__:
            raise UnsupportedBookFormatException(file_type)

        actual_book_id = book_id or f"bk_{uuid.uuid4().hex[:8]}"

        book = Book(
            id=actual_book_id,
            project_id=project_id,
            file_name=file_name,
            file_type=BookFileType(ext),
            file_size=file_size,
            storage_path=storage_path,
            content_json_path="",
            parsing_status=ParsingStatus.PENDING
        )

        saved_book = await self.repository.save(book)

        await self.event_publisher.publish(BookCreatedEvent.from_book(saved_book))

        return saved_book
