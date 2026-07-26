"""Notification 页面消息通知领域实体模块"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Any, Optional
from app.domain.common.base_entity import BaseEntity


class NotificationType(str, Enum):
    """消息通知类型"""
    PROJECT_READY = "PROJECT_READY"
    PROJECT_ARCHIVED = "PROJECT_ARCHIVED"
    PARSE_FAILED = "PARSE_FAILED"


class NotificationStatus(str, Enum):
    """消息已读/未读状态"""
    UNREAD = "UNREAD"
    READ = "READ"


@dataclass
class Notification(BaseEntity):
    """Notification 页面消息实体"""
    project_id: str = ""
    type: NotificationType = NotificationType.PROJECT_READY
    status: NotificationStatus = NotificationStatus.UNREAD
    title: str = ""
    message: str = ""
    payload: Dict[str, Any] = field(default_factory=dict)
