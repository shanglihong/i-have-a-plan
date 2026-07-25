"""应用层 UseCases 实现 (ParseBook, GetToc, GetChapterContent, HealBook)"""

import uuid
from typing import Optional, List, Dict, Any
from app.domain.book.entities import Book, BookFileType, ParsingStatus
from app.domain.book.services import (
    BookParsingEngineService,
    BookSandboxHealingService,
    BookTocQueryDomainService,
    BookChapterContentDomainService,
    BookCreationDomainService
)
from app.domain.book.ports import BookRepositoryPort, BookFileStoragePort, BookEventBusPort
from app.domain.book.exceptions import (
    BookNotFoundException,
    BookParsingFailedException,
    ChapterNotFoundException
)
from app.application.book.dtos import (
    BookResponseDTO, TocResponseDTO, ChapterContentResponseDTO, ContentBlockDTO, CreateBookRequestDTO
)


class CreateBookUseCase:
    """创建书籍用例 (解析前初始化落盘)"""

    def __init__(self, creation_service: BookCreationDomainService):
        self.creation_service = creation_service

    async def execute(self, req: CreateBookRequestDTO) -> BookResponseDTO:
        book = await self.creation_service.create_book(
            project_id=req.project_id,
            file_name=req.file_name,
            file_type=req.file_type,
            file_size=req.file_size or 0,
            storage_path=req.storage_path or ""
        )
        return BookResponseDTO.from_domain(book)


class GetBookMetadataUseCase:
    """获取书籍描述元数据用例"""

    def __init__(self, repository: BookRepositoryPort):
        self.repository = repository

    async def execute(self, book_id: str) -> BookResponseDTO:
        book = await self.repository.find_by_id(book_id)
        if not book:
            raise BookNotFoundException(book_id)
        return BookResponseDTO.from_domain(book)


class ParseBookUseCase:
    """电子书解析用例 (支持事件驱动以及 REST 接口调试触发)"""

    def __init__(
        self,
        repository: BookRepositoryPort,
        file_storage: BookFileStoragePort,
        parsing_engine: BookParsingEngineService
    ):
        self.repository = repository
        self.file_storage = file_storage
        self.parsing_engine = parsing_engine

    async def execute_parse_file(
        self,
        project_id: str,
        file_name: str,
        src_file_path: str,
        book_id: Optional[str] = None
    ) -> BookResponseDTO:
        """
        触发原书保存至沙箱并执行解析引擎
        """
        actual_book_id = book_id or f"bk_{uuid.uuid4().hex[:8]}"
        storage_path = src_file_path

        ext = file_name.split(".")[-1].upper() if "." in file_name else "TXT"
        file_type = BookFileType.TXT
        if ext in BookFileType.__members__:
            file_type = BookFileType(ext)

        existing_book = await self.repository.find_by_id(actual_book_id)
        if not existing_book:
            book = Book(
                id=actual_book_id,
                project_id=project_id,
                file_name=file_name,
                file_type=file_type,
                file_size=0,
                storage_path=storage_path,
                content_json_path="",
                parsing_status=ParsingStatus.PENDING
            )
        else:
            book = existing_book
            book.file_name = file_name
            book.file_type = file_type
            book.storage_path = storage_path
            book.parsing_status = ParsingStatus.PENDING

        await self.repository.save(book)

        parsed_book = await self.parsing_engine.parse_book(book.id)
        return BookResponseDTO.from_domain(parsed_book)


class GetBookTocUseCase:
    """获取书籍目录大纲树用例"""

    def __init__(self, toc_query_service: BookTocQueryDomainService):
        self.toc_query_service = toc_query_service

    async def execute(self, book_id: str) -> TocResponseDTO:
        b_id, toc_tree = await self.toc_query_service.get_toc_tree(book_id)
        return TocResponseDTO(
            book_id=b_id,
            toc_tree=toc_tree
        )


class GetChapterContentUseCase:
    """章节 ContentBlock 正文切片懒加载用例"""

    def __init__(self, content_service: BookChapterContentDomainService):
        self.content_service = content_service

    async def execute(
        self,
        book_id: str,
        chapter_id: str,
        offset: int = 0,
        limit: int = 50
    ) -> ChapterContentResponseDTO:
        content = await self.content_service.get_chapter_content(
            book_id=book_id,
            chapter_id=chapter_id,
            offset=offset,
            limit=limit
        )

        blocks_dtos = [
            ContentBlockDTO(
                block_id=b.get("block_id", ""),
                block_type=b.get("block_type", "PARAGRAPH"),
                sequence_index=b.get("sequence_index", 0),
                text=b.get("text", ""),
                html_or_markdown=b.get("html_or_markdown"),
                page_number=b.get("page_number"),
                bbox=b.get("bbox")
            )
            for b in content.blocks
        ]

        return ChapterContentResponseDTO(
            book_id=content.book_id,
            chapter_id=content.chapter_id,
            chapter_index=content.chapter_index,
            total_blocks=content.total_blocks,
            has_more=content.has_more,
            prev_chapter_id=content.prev_chapter_id,
            next_chapter_id=content.next_chapter_id,
            blocks=blocks_dtos
        )


class BookSandboxHealingUseCase:
    """沙箱自愈校验用例"""

    def __init__(self, healing_service: BookSandboxHealingService):
        self.healing_service = healing_service

    async def execute(self, book_id: str) -> Dict[str, Any]:
        status_code, book = await self.healing_service.verify_and_heal_book(book_id)
        return {
            "book_id": book_id,
            "status": status_code,
            "book": BookResponseDTO.from_domain(book) if book else None
        }
