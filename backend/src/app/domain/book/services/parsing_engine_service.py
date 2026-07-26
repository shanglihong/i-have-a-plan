"""书籍解析引擎服务"""

import logging
from typing import Dict, Any, List, Tuple, Optional
from app.domain.book.entities import Book, ContentBlock, HealingStatus, ParsingStatus
from app.domain.book.parser import ParserFactory
from app.domain.events import EventPublisherPort
from app.domain.book.ports import BookRepositoryPort, BookFileStoragePort
from app.domain.book.events import BookParsedEvent
from app.domain.book.exceptions import BookNotFoundException, BookParsingFailedException

logger = logging.getLogger(__name__)


class BookParsingEngineService:
    """书籍解析引擎服务"""

    def __init__(
        self,
        repository: BookRepositoryPort,
        file_storage: BookFileStoragePort,
        event_bus: EventPublisherPort
    ):
        self.repository = repository
        self.file_storage = file_storage
        self.event_bus = event_bus

    @staticmethod
    def _serialize_chapter_blocks(
        chapter_blocks: Dict[str, List[ContentBlock]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """将章节 ContentBlock 对象列表转为可序列化的字典格式"""
        serialized = {}
        for chapter_id, blocks in chapter_blocks.items():
            serialized[chapter_id] = [block.model_dump(mode="json") for block in blocks]
        return serialized

    @staticmethod
    def _calculate_total_words(chapter_blocks: Dict[str, List[ContentBlock]]) -> int:
        """计算全书章节内容的总字数"""
        total = 0
        for blocks in chapter_blocks.values():
            for block in blocks:
                total += len(block.text)
        return total

    async def parse_book(self, book_id: str) -> Book:
        """
        执行特定书籍的异步解析主流程
        """
        book = await self.repository.find_by_id(book_id)
        if not book:
            raise BookNotFoundException(book_id)

        if book.is_completed():
            logger.info(f"图书已解析完成，无需重复解析: book_id={book.id}")
            return book

        try:
            # 1. 开始解析状态转移
            book.start_parsing()
            book = await self.repository.save(book)

            # 2. 获取对应的策略解析器并执行解析
            parser = ParserFactory.get_parser(book.file_type)
            toc_tree, chapter_blocks = parser.parse(book.storage_path)

            # 3. 序列化章节数据并保存到磁盘
            raw_chapter_blocks_data = self._serialize_chapter_blocks(chapter_blocks)
            content_json_path = await self.file_storage.save_parsed_content_json(
                storage_path=book.storage_path,
                chapter_blocks_data=raw_chapter_blocks_data
            )

            # 4. 更新解析完成状态和领域数据
            total_chapters = len(chapter_blocks)
            total_words = self._calculate_total_words(chapter_blocks)
            book.complete_parsing(
                toc_tree=toc_tree,
                total_chapters=total_chapters,
                total_word_count=total_words,
                content_json_path=content_json_path
            )

            # 5. 仓储持久化并返回刷新后的领域对象
            saved_book = await self.repository.save(book)

            # 6. 广播解析完成事件
            await self.event_bus.publish(BookParsedEvent.from_book(saved_book))
            logger.info(f"图书解析成功: book_id={saved_book.id}, chapters={total_chapters}, words={total_words}, content_json_path={content_json_path}")
            return saved_book

        except Exception as e:
            logger.error(f"图书解析失败: book_id={book.id}, error={str(e)}", exc_info=True)
            book.fail_parsing()
            await self.repository.save(book)
            raise BookParsingFailedException(book.id, str(e)) from e

    async def verify_book(self, book_id: str) -> HealingStatus:
        book = await self.repository.find_by_id(book_id)
        if not book:
            return HealingStatus.NOT_FOUND

        # 检查原书物理文件是否存在
        raw_intact = await self.file_storage.check_file_hash_and_existence(book.storage_path)
        if not raw_intact:
            return HealingStatus.NOT_FOUND

        # 如果解析文件存在，状态不符合，则动作文件损坏
        json_intact = await self.file_storage.check_file_hash_and_existence(book.content_json_path)
        if json_intact:
            return HealingStatus.CORRUPTED

        return HealingStatus.HEALED_REPARSING

    async def fix_book(self, book: Book):
        status = await self.verify_book(book.id)
        if status == HealingStatus.CORRUPTED:
            logger.info(f"图书 {book.id} - {book.file_name}解析文件开始执行删除")
            await self.file_storage.delete_parsed_content(book.content_json_path)
            await self.parse_book(book.id)

        elif status == HealingStatus.HEALED_REPARSING:
            await self.parse_book(book.id)

        elif status == HealingStatus.NOT_FOUND:
            book.fail_parsing()
            await self.repository.save(book)
            await self.file_storage.delete_book_dir(book.storage_path)
            
        logger.info(f"图书 {book.id} - {book.file_name}修复完成")


