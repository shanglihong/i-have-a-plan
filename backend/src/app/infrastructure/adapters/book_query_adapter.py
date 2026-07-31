"""Book 领域正文切片查询适配器实现

实现 Agent 领域的 BookQueryPort 端口接口，驱动 Book 领域章节内容服务，
根据 block_id 查询底层 ContentBlock 领域实体，并转换为 Agent 领域的 BookContentBlock 对象。
"""

import logging
from typing import Optional

from app.domain.agent.tools.tool_ports import BookQueryPort, BookContentBlock
from app.domain.book.services.query_service import BookChapterContentDomainService

logger = logging.getLogger(__name__)


class BookQueryDomainAdapter(BookQueryPort):
    """基于 BookChapterContentDomainService 的 BookQueryPort 适配器"""

    def __init__(self, chapter_content_service: BookChapterContentDomainService):
        self.chapter_content_service = chapter_content_service

    async def get_content_block_by_id(self, block_id: str, book_id: str) -> BookContentBlock:
        """根据 block_id 与 book_id 驱动 BookChapterContentDomainService 获取底层 ContentBlock 切片实体，并转换为 Agent 领域的 BookContentBlock 对象"""
        try:
            result = await self.chapter_content_service.get_block_by_id(block_id=block_id, book_id=book_id)
            if result:
                content_block, chapter_title = result
                return BookContentBlock(
                    block_id=content_block.block_id,
                    content=content_block.text or content_block.html_or_markdown or "",
                    chapter_title=chapter_title,
                    book_id=book_id,
                    sequence_order=content_block.sequence_index,
                )

            logger.warning(f"BookQueryDomainAdapter 未找到 block_id={block_id} 对应的切片信息")
            return BookContentBlock(
                block_id=block_id,
                content="",
            )

        except Exception as e:
            logger.error(f"BookQueryDomainAdapter 检索 block_id={block_id} 异常: {e}", exc_info=True)
            return BookContentBlock(
                block_id=block_id,
                content="",
            )
