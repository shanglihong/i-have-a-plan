"""书籍领域查询服务 (Domain Services)"""

from typing import List, Dict, Any, Tuple, Optional
from app.domain.book.entities import Book, ChapterContent, ContentBlock, ParsingStatus
from app.domain.book.ports import BookRepositoryPort, BookFileStoragePort
from app.domain.book.exceptions import (
    BookNotFoundException,
    BookParsingFailedException,
    ChapterNotFoundException
)
from app.utils.cache import LRUCache, book_content_cache


class BookQueryDomainService:
    """书籍领域查询服务（目录、基本信息）"""

    def __init__(self, repository: BookRepositoryPort):
        self.repository = repository

    async def get_toc_tree(self, book_id: str) -> Tuple[str, List[Dict[str, Any]]]:
        book = await self.repository.find_by_id(book_id)
        if not book:
            raise BookNotFoundException(book_id)
        return book.id, book.parsed_structure or []

    async def get_book_by_id(self, book_id: str) -> Book:
        book = await self.repository.find_by_id(book_id)
        if not book:
            raise BookNotFoundException(book_id)
        return book

    async def get_pending_list(self, size: int = 100) -> List[Book]:
        books, total = await self.repository.list_books(
            parsing_status=ParsingStatus.PENDING,
            size=size,
        )
        return books

    async def get_parsing_list(self, size: int = 100) -> List[Book]:
        books, total = await self.repository.list_books(
            parsing_status=ParsingStatus.PARSING,
            size=size,
        )
        return books


class BookChapterContentDomainService:
    """章节 ContentBlock 正文切片懒加载领域服务"""

    def __init__(
        self,
        repository: BookRepositoryPort,
        file_storage: BookFileStoragePort,
        cache: Optional[LRUCache[Dict[str, Any]]] = None
    ):
        self.repository = repository
        self.file_storage = file_storage
        self.cache = cache if cache is not None else book_content_cache

    async def _get_all_parsed_content(self, content_json_path: str) -> Dict[str, Any]:
        """获取图书的全量解析数据（优先命中 LRU 缓存）"""
        cached_content = self.cache.get(content_json_path)
        if cached_content is not None:
            return cached_content

        all_parsed = await self.file_storage.read_all_parsed_content(content_json_path) or {}
        if all_parsed:
            self.cache.set(content_json_path, all_parsed)

        return all_parsed

    async def get_chapter_content(
        self,
        book_id: str,
        chapter_id: str,
        offset: int = 0,
        limit: int = 50
    ) -> ChapterContent:
        # 1. 查找图书并校验解析状态
        book = await self.repository.find_by_id(book_id)
        if not book:
            raise BookNotFoundException(book_id)

        if not book.is_completed():
            raise BookParsingFailedException(book_id, f"图书未解析完成 (当前状态: {book.parsing_status.value})")

        # 2. 读取解析内容（优先读取缓存）
        all_parsed = await self._get_all_parsed_content(book.content_json_path)
        if chapter_id not in all_parsed:
            raise ChapterNotFoundException(chapter_id)

        # 3. 计算章节内 ContentBlock 分页切片
        raw_blocks = all_parsed.get(chapter_id, [])
        total_blocks = len(raw_blocks)
        sliced_raw = raw_blocks[offset: offset + limit]
        has_more = (offset + limit) < total_blocks

        sliced_blocks = [
            ContentBlock.from_dict(b) if isinstance(b, dict) else b
            for b in sliced_raw
        ]

        # 4. 计算前一章与后一章 ID
        all_chapter_ids = list(all_parsed.keys())
        current_index = all_chapter_ids.index(chapter_id)

        prev_chapter_id = all_chapter_ids[current_index - 1] if current_index > 0 else None
        next_chapter_id = (
            all_chapter_ids[current_index + 1]
            if current_index < len(all_chapter_ids) - 1
            else None
        )

        return ChapterContent(
            book_id=book.id,
            chapter_id=chapter_id,
            chapter_index=current_index,
            total_blocks=total_blocks,
            has_more=has_more,
            prev_chapter_id=prev_chapter_id,
            next_chapter_id=next_chapter_id,
            blocks=sliced_blocks
        )