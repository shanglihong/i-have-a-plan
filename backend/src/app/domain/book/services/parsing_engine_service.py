"""书籍解析引擎服务"""

from app.domain.book.entities import HealingStatus
import logging
from typing import Dict, Any, List
from app.domain.book.entities import Book, ContentBlock
from app.domain.book.strategies import ParserFactory
from app.domain.common.ports import EventPublisherPort
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

        if book.is_completed:
            logger.info(f"图书已解析完成，无需重复解析: book_id={book.id}")
            return book

        try:
            # 1. 开始解析状态转移
            book.start_parsing()
            await self.repository.save(book)

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

            # 5. 仓储持久化
            await self.repository.save(book)

            # 6. 广播解析完成事件
            await self.event_bus.publish(BookParsedEvent.from_book(book))
            logger.info(f"图书解析成功: book_id={book.id}, chapters={total_chapters}, words={total_words}")
            return book

        except Exception as e:
            logger.error(f"图书解析失败: book_id={book.id}, error={str(e)}", exc_info=True)
            book.fail_parsing()
            await self.repository.save(book)
            raise BookParsingFailedException(book.id, str(e)) from e
