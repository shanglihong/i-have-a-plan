"""
Project 领域事件消费者单元测试
"""

import pytest
from app.consumers import register_consumers
from app.consumers.project_consumer import handle_project_created, handle_project_archived
from app.domain.project.events import ProjectCreatedEvent, ProjectArchivedEvent
from app.domain.notification.notification import NotificationType
from app.domain.notification.notification_service import global_notification_service
from app.infrastructure.event_bus.asyncio_event_bus import global_event_bus


@pytest.mark.asyncio
async def test_register_project_consumers() -> None:
    """验证 Project 事件成功注册到事件总线"""
    register_consumers()

    assert ProjectCreatedEvent in global_event_bus._subscribers
    assert handle_project_created in global_event_bus._subscribers[ProjectCreatedEvent]
    assert ProjectArchivedEvent in global_event_bus._subscribers
    assert handle_project_archived in global_event_bus._subscribers[ProjectArchivedEvent]


@pytest.mark.asyncio
async def test_handle_project_archived_creates_notification() -> None:
    """验证 ProjectArchivedEvent 被消费者触发后正确生成 notification 消息卡片"""
    event = ProjectArchivedEvent(project_id="proj_archived_test")
    await handle_project_archived(event)

    notifications = global_notification_service._notifications
    archived_notices = [n for n in notifications if n.project_id == "proj_archived_test"]
    assert len(archived_notices) > 0
    assert archived_notices[-1].type == NotificationType.PROJECT_ARCHIVED
    assert archived_notices[-1].payload.get("action") == "create_experience_note"
