"""图书领域事件消费者 (Book Event Consumer)

作为 Interface/Consumer 接入层，接收 BookCreatedEvent / BookParsedEvent 等领域事件，
并通过 AppContainer 检索依赖驱动领域服务。
"""

import logging
from app.domain.book.events import BookCreatedEvent, BookParsedEvent
from app.infrastructure.db.session import get_async_session
from app.container import AppContainer
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


async def handle_book_created(event: BookCreatedEvent) -> None:
    """消费 BookCreatedEvent 领域事件，自动触发图书解析引擎逻辑"""
    logger.info(f"[BookConsumer] 收到 BookCreatedEvent 事件，准备解析图书: book_id={event.book_id}")

    try:
        async for session in get_async_session():
            container = AppContainer(session)
            await container.parsing_engine.parse_book(event.book_id)
            logger.info(f"[BookConsumer] 图书解析完成: book_id={event.book_id}")
            break
    except Exception as e:
        logger.error(f"[BookConsumer] 处理 BookCreatedEvent 失败: book_id={event.book_id}, error={str(e)}", exc_info=True)


async def handle_book_parsed(event: BookParsedEvent) -> None:
    """消费 BookParsedEvent 领域事件，自动为项目挂载任务树并激活状态"""
    logger.info(f"[BookConsumer] 收到 BookParsedEvent 事件，准备挂载 Task 树: project_id={event.project_id}, book_id={event.book_id}")

    try:
        async for session in get_async_session():
            container = AppContainer(session)

            toc_tree: List[Dict[str, Any]] = []
            try:
                _, toc_tree = await container.book_service.get_toc_tree(event.book_id)
            except Exception as e:
                logger.error(f"获取 Book 大纲树失败 (book_id={event.book_id}): {e}", exc_info=True)

            await container.task_op_service.mount_task_tree_and_activate(project_id=event.project_id, book_id=event.book_id, toc_tree=toc_tree)
            logger.info(f"[BookConsumer] 项目任务(Task)树挂载并激活成功: project_id={event.project_id}")
            break
    except Exception as e:
        logger.error(f"[BookConsumer] 处理 BookParsedEvent (Task 挂载) 失败: project_id={event.project_id}, error={str(e)}", exc_info=True)
