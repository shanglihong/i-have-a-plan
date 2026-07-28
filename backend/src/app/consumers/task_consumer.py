"""Project 领域事件消费者模块"""

import logging
from app.domain.project.events import ProjectCreatedEvent, ProjectArchivedEvent
from app.domain.notification.notification_service import global_notification_service

logger = logging.getLogger(__name__)


async def handle_project_created(event: ProjectCreatedEvent) -> None:
    """处理项目就绪事件，持久化并生成通知卡片"""
    logger.info(f"[ProjectConsumer] 收到 ProjectCreatedEvent: project_id={event.project_id}")
    await global_notification_service.handle_project_created(event)


async def handle_project_archived(event: ProjectArchivedEvent) -> None:
    """处理项目结项归档事件，持久化并生成通知卡片"""
    logger.info(f"[ProjectConsumer] 收到 ProjectArchivedEvent: project_id={event.project_id}")
    await global_notification_service.handle_project_archived(event)
