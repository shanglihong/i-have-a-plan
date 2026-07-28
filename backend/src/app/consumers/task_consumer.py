"""Task 领域事件消费者模块"""

import logging
from app.domain.project.events import ProjectDeleteEvent, TaskDeleteEvent
from app.infrastructure.db.session import get_async_session
from app.container import AppContainer\

logger = logging.getLogger(__name__)


async def handle_project_delete(event: ProjectDeleteEvent) -> None:
    logger.info(f"[TaskConsumer] 收到 ProjectDeleteEvent: project_id={event.project_id}")
    async for session in get_async_session():
        container = AppContainer(session)
        await container.task_state_service.delete_chains(event.project_id)


async def handle_task_delete(event: TaskDeleteEvent) -> None:
    logger.info(f"[TaskConsumer] 收到 TaskDeleteEvent: project_id={event.task_chain_ids}")
    async for session in get_async_session():
        container = AppContainer(session)
        await container.task_op_service.detach_notes(event.task_chain_ids)