"""SQLite 仓储适配器实现 (BookRepositoryAdapter)"""

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.book.entities import Book, BookFileType, ParsingStatus
from app.domain.book.ports import BookRepositoryPort
from app.infrastructure.db.models.book import BookDO


class BookRepositoryAdapter(BookRepositoryPort):
    """基于 SQLModel 与 SQLite 的仓储实现"""

    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_domain(self, do: BookDO) -> Book:
        file_type = BookFileType(do.file_type) if do.file_type in BookFileType.__members__ else BookFileType.TXT
        status = ParsingStatus(do.parsing_status) if do.parsing_status in ParsingStatus.__members__ else ParsingStatus.PENDING

        return Book(
            id=do.id,
            project_id=do.project_id,
            file_name=do.file_name,
            file_type=file_type,
            file_size=do.file_size,
            storage_path=do.storage_path,
            content_json_path=do.content_json_path,
            parsing_status=status,
            parsed_structure=do.parsed_structure or [],
            total_chapters=do.total_chapters,
            total_word_count=do.total_word_count,
            created_at=do.created_at,
            updated_at=do.updated_at
        )

    async def save(self, book: Book) -> Book:
        existing_do = await self.session.get(BookDO, book.id)
        now = datetime.now(timezone.utc)
        status_str = book.parsing_status.value if hasattr(book.parsing_status, "value") else str(book.parsing_status)
        file_type_str = book.file_type.value if hasattr(book.file_type, "value") else str(book.file_type)

        if not existing_do:
            do = BookDO(
                id=book.id,
                project_id=book.project_id,
                file_name=book.file_name,
                file_type=file_type_str,
                file_size=book.file_size,
                storage_path=book.storage_path,
                content_json_path=book.content_json_path,
                parsing_status=status_str,
                parsed_structure=book.parsed_structure,
                total_chapters=book.total_chapters,
                total_word_count=book.total_word_count,
                created_at=book.created_at or now,
                updated_at=now
            )
            self.session.add(do)
        else:
            existing_do.project_id = book.project_id
            existing_do.file_name = book.file_name
            existing_do.file_type = file_type_str
            existing_do.file_size = book.file_size
            existing_do.storage_path = book.storage_path
            existing_do.content_json_path = book.content_json_path
            existing_do.parsing_status = status_str
            existing_do.parsed_structure = book.parsed_structure
            existing_do.total_chapters = book.total_chapters
            existing_do.total_word_count = book.total_word_count
            existing_do.updated_at = now
            do = existing_do

        await self.session.commit()
        await self.session.refresh(do)
        return self._to_domain(do)

    async def find_by_id(self, book_id: str) -> Optional[Book]:
        do = await self.session.get(BookDO, book_id)
        if not do:
            return None
        return self._to_domain(do)

    async def find_by_project_id(self, project_id: str) -> Optional[Book]:
        statement = select(BookDO).where(BookDO.project_id == project_id)
        result = await self.session.exec(statement)
        do = result.first()
        if not do:
            return None
        return self._to_domain(do)

    async def delete(self, book_id: str) -> bool:
        do = await self.session.get(BookDO, book_id)
        if not do:
            return False
        await self.session.delete(do)
        await self.session.commit()
        return True
