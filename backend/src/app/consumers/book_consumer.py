"""图书领域事件消费者 (Book Event Consumer)

作为 Interface/Consumer 接入层，接收 BookCreatedEvent / BookParsedEvent 等领域事件并驱动领域服务。
"""

import logging
from app.domain.book.events import BookCreatedEvent, BookParsedEvent
from app.domain.book.services import BookParsingEngineService, BookTocQueryDomainService
from app.domain.project.services import TaskOperationDomainService
from app.infrastructure.db.session import get_async_session
from app.infrastructure.db.repositories.book_repository import BookRepositoryAdapter
from app.infrastructure.db.repositories.project_repository import ProjectRepository
from app.infrastructure.db.repositories.task_repository import TaskRepository
from app.infrastructure.file_storage.book_storage import LocalBookFileStorageAdapter
from app.infrastructure.event_bus.asyncio_event_bus import global_event_bus

logger = logging.getLogger(__name__)


async def handle_book_created(event: BookCreatedEvent) -> None:
    """消费 BookCreatedEvent 领域事件，自动触发图书解析引擎逻辑"""
    logger.info(f"[BookConsumer] 收到 BookCreatedEvent 事件，准备解析图书: book_id={event.book_id}")

    try:
        async for session in get_async_session():
            repository = BookRepositoryAdapter(session)
            file_storage = LocalBookFileStorageAdapter()
            parsing_engine = BookParsingEngineService(
                repository=repository,
                file_storage=file_storage,
                event_bus=global_event_bus
            )
            await parsing_engine.parse_book(event.book_id)
            logger.info(f"[BookConsumer] 图书解析完成: book_id={event.book_id}")
            break
    except Exception as e:
        logger.error(f"[BookConsumer] 处理 BookCreatedEvent 失败: book_id={event.book_id}, error={str(e)}", exc_info=True)


async def handle_book_parsed(event: BookParsedEvent) -> None:
    """消费 BookParsedEvent 领域事件，自动为项目挂载任务树并激活状态"""
    logger.info(f"[BookConsumer] 收到 BookParsedEvent 事件，准备挂载 Task 树: project_id={event.project_id}, book_id={event.book_id}")

    try:
        async for session in get_async_session():
            project_repo = ProjectRepository(session)
            task_repo = TaskRepository(session)
            book_repo = BookRepositoryAdapter(session)
            book_toc_service = BookTocQueryDomainService(repository=book_repo)

            task_op_service = TaskOperationDomainService(
                project_repo=project_repo,
                task_repo=task_repo,
                book_toc_service=book_toc_service,
                event_publisher=global_event_bus
            )

            await task_op_service.mount_book_task_tree(project_id=event.project_id, book_id=event.book_id)
            logger.info(f"[BookConsumer] 项目任务(Task)树挂载并激活成功: project_id={event.project_id}")
            break
    except Exception as e:
        logger.error(f"[BookConsumer] 处理 BookParsedEvent (Task 挂载) 失败: project_id={event.project_id}, error={str(e)}", exc_info=True)
