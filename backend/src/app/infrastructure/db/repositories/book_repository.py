"""SQLite 仓储适配器实现 (BookRepositoryAdapter)"""

from enum import Enum
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.book.entities import Book, BookFileType, ParsingStatus
from app.domain.book.ports import BookRepositoryPort
from app.infrastructure.db.models.book import BookDO


class BookRepositoryAdapter(BookRepositoryPort):
    """基于 SQLModel 与 SQLite 的仓储实现"""

    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_domain(self, do: BookDO) -> Book:
        raw_type = str(do.file_type).replace("BookFileType.", "").strip().upper()
        if raw_type in BookFileType.__members__:
            file_type = BookFileType[raw_type]
        else:
            try:
                file_type = BookFileType(raw_type)
            except (ValueError, KeyError):
                file_type = BookFileType.TXT

        raw_status = str(do.parsing_status).replace("ParsingStatus.", "").strip().upper()
        if raw_status in ParsingStatus.__members__:
            status = ParsingStatus[raw_status]
        else:
            try:
                status = ParsingStatus(raw_status)
            except (ValueError, KeyError):
                status = ParsingStatus.PENDING

        import json
        parsed_struct = do.parsed_structure
        if isinstance(parsed_struct, str):
            try:
                parsed_struct = json.loads(parsed_struct)
            except Exception:
                parsed_struct = []
        elif not parsed_struct:
            parsed_struct = []

        return Book(
            id=do.id,
            project_id=do.project_id,
            file_name=do.file_name,
            file_type=file_type,
            file_size=do.file_size,
            storage_path=do.storage_path,
            content_json_path=do.content_json_path,
            parsing_status=status,
            parsed_structure=parsed_struct,
            total_chapters=do.total_chapters,
            total_word_count=do.total_word_count,
            created_at=do.created_at,
            updated_at=do.updated_at
        )

    async def save(self, book: Book) -> Book:
        existing_do = await self.session.get(BookDO, book.id)
        now = datetime.now(timezone.utc)
        status_str = book.parsing_status.value if isinstance(book.parsing_status, Enum) else str(book.parsing_status)
        file_type_str = book.file_type.value if isinstance(book.file_type, Enum) else str(book.file_type)

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
        return self._to_domain(do)

    async def find_by_id(self, book_id: str) -> Optional[Book]:
        statement = select(BookDO).where(BookDO.id == book_id)
        result = await self.session.execute(statement)
        do = result.scalars().first()
        if not do:
            return None
        return self._to_domain(do)

    async def find_by_project_id(self, project_id: str) -> Optional[Book]:
        statement = select(BookDO).where(BookDO.project_id == project_id)
        result = await self.session.execute(statement)
        do = result.scalars().first()
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

    async def list_books(
        self,
        parsing_status: Optional[ParsingStatus] = None,
        page: int = 1,
        size: int = 100,
    ) -> Tuple[List[Book], int]:
        statement = select(BookDO)
        if parsing_status:
            status_str = parsing_status.value if hasattr(parsing_status, "value") else str(parsing_status)
            statement = statement.where(BookDO.parsing_status == status_str)

        count_stmt = select(func.count()).select_from(statement.subquery())
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one_or_none() or 0

        offset = (page - 1) * size
        statement = statement.offset(offset).limit(size)
        result = await self.session.execute(statement)
        dos = result.scalars().all()

        return [self._to_domain(do) for do in dos], total
