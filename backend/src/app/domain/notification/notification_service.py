"""NotificationService 消息通知订阅与持久化推送服务"""

import uuid
from datetime import datetime, timezone
from typing import List, Dict
from app.domain.notification.notification import Notification, NotificationType, NotificationStatus
from app.domain.project.events import ProjectCreatedEvent, ProjectArchivedEvent, ProjectParseFailedEvent


class NotificationService:
    """页面消息通知服务（内存/SQLite 内存挂载，支持监听项目领域事件）"""

    def __init__(self):
        self._notifications: List[Notification] = []

    async def handle_project_created(self, event: ProjectCreatedEvent) -> Notification:
        """响应 ProjectCreatedEvent，持久化 Notification 实体 (type=PROJECT_READY)"""
        notice = Notification(
            id=f"notice_{uuid.uuid4().hex[:12]}",
            project_id=event.project_id,
            type=NotificationType.PROJECT_READY,
            status=NotificationStatus.UNREAD,
            title="项目就绪",
            message=f"项目 {event.project_id} 已成功建树并激活，工作台随时可访问。",
            payload={"status": event.status, "project_type": event.project_type},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self._notifications.append(notice)
        return notice

    async def handle_project_archived(self, event: ProjectArchivedEvent) -> Notification:
        """响应 ProjectArchivedEvent，持久化 Notification 实体 (type=PROJECT_ARCHIVED)"""
        notice = Notification(
            id=f"notice_{uuid.uuid4().hex[:12]}",
            project_id=event.project_id,
            type=NotificationType.PROJECT_ARCHIVED,
            status=NotificationStatus.UNREAD,
            title="项目已结项归档",
            message=f"项目 {event.project_id} 已成功归档。点击可在线生成经验笔记。",
            payload={"action": "create_experience_note", "project_id": event.project_id},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self._notifications.append(notice)
        return notice

    async def handle_parse_failed(self, event: ProjectParseFailedEvent) -> Notification:
        """响应 ProjectParseFailedEvent，持久化 Warning Notification 实体 (type=PARSE_FAILED)"""
        notice = Notification(
            id=f"notice_{uuid.uuid4().hex[:12]}",
            project_id=event.project_id,
            type=NotificationType.PARSE_FAILED,
            status=NotificationStatus.UNREAD,
            title="电子书解析失败",
            message=f"电子书文件损坏或解析中断：{event.reason}。请重新上传。",
            payload={"reason": event.reason},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self._notifications.append(notice)
        return notice

    def get_notifications(self) -> List[Notification]:
        return self._notifications


# 全局单例消息通知服务
global_notification_service = NotificationService()
