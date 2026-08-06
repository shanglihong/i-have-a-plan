from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from app.utils.path import get_workspace_dir
from app.domain.book.entities import Book, TocNode, ChapterContent, ContentBlock, ParsingStatus, BookFileType
from app.domain.book.ports import BookRepositoryPort, BookFileStoragePort
from app.domain.book.exceptions import (
    BookNotFoundException,
    BookParsingFailedException,
    ChapterNotFoundException,
    BookImageNotFoundException,
    UnsupportedBookFormatException,
)
from app.utils.cache import LRUCache


class BookQueryDomainService:
    """书籍领域查询服务（目录、基本信息、图片）"""

    def __init__(self, repository: BookRepositoryPort):
        self.repository = repository

    async def get_book_image_path(self, book_id: str, image_name: str) -> Path:
        """获取图书图片路径：直接从 book.storage_path 定位，仅限于 EPUB 图书"""
        import zipfile

        book = await self.repository.find_by_id(book_id)
        if not book or not book.storage_path:
            raise BookNotFoundException(book_id)

        # 判定图书文件类型，限制该图片提取接口仅适用于 EPUB 图书
        is_epub = (
            getattr(book, "file_type", None) == BookFileType.EPUB
            or str(getattr(book, "file_type", "")).upper() == "EPUB"
            or str(book.storage_path).lower().endswith(".epub")
        )
        if not is_epub:
            raise UnsupportedBookFormatException(str(getattr(book, "file_type", "UNKNOWN")))

        # 1. 源文件物理路径与所在目录
        storage_file = Path(book.storage_path)
        base_dir = storage_file.parent
        clean_name = Path(image_name).name

        # 2. 优先检查磁盘上已解压存在的图片文件
        for check_path in [
            base_dir / image_name,
            base_dir / "images" / image_name,
            base_dir / clean_name,
            base_dir / "images" / clean_name,
        ]:
            if check_path.exists() and check_path.is_file():
                return check_path.resolve()

        # 3. EPUB 原书直接从 Zip 包内部寻找并自动解压释放
        if storage_file.exists() and storage_file.is_file() and zipfile.is_zipfile(storage_file):
            with zipfile.ZipFile(storage_file, "r") as zf:
                matched_zip_name = None
                for name in zf.namelist():
                    if (
                        name == image_name
                        or name.endswith("/" + image_name)
                        or Path(name).name.lower() == clean_name.lower()
                    ):
                        matched_zip_name = name
                        break

                if matched_zip_name:
                    out_path = base_dir / "images" / clean_name
                    out_path.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(matched_zip_name) as source, open(out_path, "wb") as target:
                        target.write(source.read())
                    return out_path.resolve()

        raise BookImageNotFoundException(image_name)

    async def get_toc_tree(self, book_id: str) -> Tuple[str, List[TocNode]]:
        book = await self.repository.find_by_id(book_id)
        if not book:
            raise BookNotFoundException(book_id)
        return book.id, book.toc_tree

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

    async def get_completed_list(self, size: int = 100) -> List[Book]:
        books, total = await self.repository.list_books(
            parsing_status=ParsingStatus.COMPLETED,
            size=size,
        )
        return books


class BookChapterContentDomainService:
    """章节 ContentBlock 正文切片懒加载领域服务"""

    def __init__(
        self,
        repository: BookRepositoryPort,
        file_storage: BookFileStoragePort,
        cache: Optional[LRUCache[Dict[str, List[ContentBlock]]]] = None
    ):
        self.repository = repository
        self.file_storage = file_storage
        self.cache = cache if cache is not None else LRUCache[dict](capacity=50)

    async def _get_all_parsed_content(self, content_json_path: str) -> Dict[str, List[ContentBlock]]:
        """获取图书的全量解析数据（章节 ID -> ContentBlock 列表，优先命中 LRU 缓存）"""
        cached_content = self.cache.get(content_json_path)
        if cached_content is not None:
            return cached_content

        raw_parsed = await self.file_storage.read_all_parsed_content(content_json_path) or {}
        parsed_domain_map: Dict[str, List[ContentBlock]] = {}

        if raw_parsed:
            for chapter_id, raw_blocks in raw_parsed.items():
                if isinstance(raw_blocks, list):
                    parsed_domain_map[chapter_id] = [
                        ContentBlock.from_dict(b) if isinstance(b, dict) else b
                        for b in raw_blocks
                    ]
                else:
                    parsed_domain_map[chapter_id] = []

            self.cache.set(content_json_path, parsed_domain_map)

        return parsed_domain_map

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
        chapter_blocks = all_parsed.get(chapter_id, [])
        total_blocks = len(chapter_blocks)
        sliced_blocks = chapter_blocks[offset: offset + limit]
        has_more = (offset + limit) < total_blocks

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

    async def validate_block_exists(self, book_id: str, chapter_id: str) -> bool:
        """验证正文章节是否存在"""
        try:
            book = await self.repository.find_by_id(book_id)
            if not book:
                return False
            all_parsed = await self._get_all_parsed_content(book.content_json_path)
            return chapter_id in all_parsed
        except Exception:
            return False

    async def get_chapter_content_blocks(self, book_id: str, chapter_id: str) -> List[ContentBlock]:
        """读取章节 ContentBlock 列表以进行锚点三层重锚定解算"""
        try:
            content = await self.get_chapter_content(
                book_id=book_id,
                chapter_id=chapter_id,
                offset=0,
                limit=99999
            )
            return content.blocks
        except Exception:
            return []

    async def get_block_by_id(self, block_id: str, book_id: str) -> Optional[Tuple[ContentBlock, str]]:
        try:
            target_books: List[Book] = []
            single_book = await self.repository.find_by_id(book_id)
            if single_book and single_book.is_completed():
                target_books = [single_book]

            for book in target_books:
                if not book.content_json_path:
                    continue

                all_parsed = await self._get_all_parsed_content(book.content_json_path)
                if not all_parsed:
                    continue

                for chapter_id, blocks in all_parsed.items():
                    for block in blocks:
                        if block.block_id == block_id:
                            return block, chapter_id
            return None
        except Exception:
            return None