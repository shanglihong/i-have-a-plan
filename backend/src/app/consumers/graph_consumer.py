"""旁路图谱与 RAG 领域事件消费者 (Graph Event Consumer)

接收 MaterialNoteCreatedEvent / BookParsedEvent 等领域事件，
自动调用 graph_sync_service.enqueue_block 将新物料切片推入旁路图谱建图队列。
"""

import logging
from app.domain.note.events import MaterialNoteCreatedEvent
from app.domain.book.events import BookParsedEvent
from app.domain.graph.entities import SourceTypeEnum
from app.infrastructure.db.session import get_async_session
from app.container import AppContainer

logger = logging.getLogger(__name__)

# TODO 笔记更新事件, 还有沉淀笔记相关
async def handle_material_note_created(event: MaterialNoteCreatedEvent) -> None:
    """消费 MaterialNoteCreatedEvent 事件，往 graph_pending_blocks 推入待建图切片"""
    logger.info(
        f"[GraphConsumer] 收到 MaterialNoteCreatedEvent 事件: note_id={event.note_id}, project_id={event.project_id}"
    )

    try:
        async for session in get_async_session():
            container = AppContainer(session)
            await container.graph_sync_service.enqueue_block(
                block_id=event.note_id,
                source_type=SourceTypeEnum.NOTE_CARD,
                project_id=event.project_id,
            )
            logger.info(
                f"[GraphConsumer] 素材卡片推入图谱待建图队列成功: note_id={event.note_id}"
            )
            break
    except Exception as e:
        logger.error(
            f"[GraphConsumer] 处理 MaterialNoteCreatedEvent 失败: note_id={event.note_id}, error={str(e)}",
            exc_info=True,
        )


async def handle_book_parsed(event: BookParsedEvent) -> None:
    """消费 BookParsedEvent 事件，批量获取图书解析切片并推入图谱建图队列"""
    logger.info(
        f"[GraphConsumer] 收到 BookParsedEvent 事件: book_id={event.book_id}, project_id={event.project_id}"
    )

    try:
        async for session in get_async_session():
            container = AppContainer(session)
            book = await container.book_service.get_book_by_id(event.book_id)
            if not book or not book.toc_tree:
                break

            count = 0
            for node in book.toc_tree:
                if node.chapter_id:
                    chapter_content = await container.book_content_service.get_chapter_content(
                        book_id=book.id, chapter_id=node.chapter_id, limit=500
                    )
                    for block in chapter_content.blocks:
                        await container.graph_sync_service.enqueue_block(
                            block_id=block.block_id,
                            source_type=SourceTypeEnum.BOOK_BLOCK,
                            project_id=event.project_id or book.id,
                        )
                        count += 1

            logger.info(
                f"[GraphConsumer] 图书切片批量推入图谱待建图队列成功: book_id={event.book_id}, count={count}"
            )
            break
    except Exception as e:
        logger.error(
            f"[GraphConsumer] 处理 BookParsedEvent (图谱推流) 失败: book_id={event.book_id}, error={str(e)}",
            exc_info=True,
        )
