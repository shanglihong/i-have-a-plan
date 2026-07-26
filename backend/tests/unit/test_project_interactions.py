"""全量序列交互图与事件链条单元与集成测试

校验 project_backend_design_spec_v1.0.md 规范中 4 个 Mermaid 序列图的完整交互逻辑。
"""

import pytest
from app.domain.project.entities import Project, ProjectStatus, ProjectType
from app.domain.book.events import BookParseRequestedEvent
from app.domain.project.events import (
    ProjectCreatedEvent,
    ProjectArchivedEvent,
    ExperienceNoteCreatedEvent,
)
from app.domain.notification.notification import NotificationType
from app.domain.notification.notification_service import NotificationService
from app.domain.project.services import StartupHealingThread
from app.infrastructure.db.session import init_db, get_async_session
from app.infrastructure.db.repositories.project_repository import ProjectRepository
from app.infrastructure.db.repositories.task_repository import TaskRepository


@pytest.mark.asyncio
async def test_notification_service_interaction() -> None:
    service = NotificationService()

    # 1. 模拟 ProjectCreatedEvent 产生 Notification(type=PROJECT_READY)
    event1 = ProjectCreatedEvent(project_id="proj_created_1", project_type="PLAN", status="ACTIVE")
    notice1 = await service.handle_project_created(event1)
    assert notice1.type == NotificationType.PROJECT_READY
    assert notice1.project_id == "proj_created_1"

    # 2. 模拟 ProjectArchivedEvent 产生 Notification(type=PROJECT_ARCHIVED)
    event2 = ProjectArchivedEvent(project_id="proj_archived_1")
    notice2 = await service.handle_project_archived(event2)
    assert notice2.type == NotificationType.PROJECT_ARCHIVED
    assert notice2.payload["action"] == "create_experience_note"

    notices = service.get_notifications()
    assert len(notices) == 2


@pytest.mark.asyncio
async def test_startup_healing_thread_interaction() -> None:
    await init_db()
    async for session in get_async_session():
        project_repo = ProjectRepository(session)
        task_repo = TaskRepository(session)

        # 创建半成品 INIT 项目 (模拟强杀残留)
        p1 = Project(id="proj_healing_1", title="半成品阅读项目", project_type=ProjectType.READING, status=ProjectStatus.INIT, book_id="bk_heal_1")
        await project_repo.save(p1)

        # 触发冷启动修复线程
        healing = StartupHealingThread(project_repo, task_repo)
        summary = await healing.trigger_startup_healing()

        assert len(summary) >= 1
        healed_p1 = await project_repo.get_by_id("proj_healing_1")
        assert healed_p1 is not None
        assert healed_p1.status == ProjectStatus.ACTIVE
        break
