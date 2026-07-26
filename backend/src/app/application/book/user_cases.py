"""应用层 UseCases 实现 (ParseBook, GetToc, GetChapterContent, HealBook)"""

import uuid
from typing import Dict, Any
from app.domain.book.services import (
    BookParsingEngineService,
    BookQueryDomainService,
    BookChapterContentDomainService,
    BookCreationDomainService
)
from app.domain.book.ports import BookRepositoryPort, BookFileStoragePort
from app.domain.book.exceptions import (
    BookNotFoundException,
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
        book_id: str
    ) -> BookResponseDTO:
        """
        触发原书保存至沙箱并执行解析引擎
        """
        parsed_book = await self.parsing_engine.parse_book(book_id)
        return BookResponseDTO.from_domain(parsed_book)


class GetBookTocUseCase:
    """获取书籍目录大纲树用例"""

    def __init__(self, query_service: BookQueryDomainService):
        self.query_service = query_service

    async def execute(self, book_id: str) -> TocResponseDTO:
        b_id, toc_tree = await self.query_service.get_toc_tree(book_id)
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
                block_id=b.block_id,
                block_type=b.block_type.value if hasattr(b.block_type, "value") else str(b.block_type),
                sequence_index=b.sequence_index,
                text=b.text,
                html_or_markdown=b.html_or_markdown,
                page_number=b.page_number,
                bbox=b.bbox
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
