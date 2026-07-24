"""AI 伴读与沙箱 Agent 领域实体模块"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
from app.domain.common.base_entity import BaseEntity


class SessionStatus(str, Enum):
    """伴读会话状态枚举"""
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class SenderType(str, Enum):
    """消息发送方枚举"""
    USER = "USER"
    AGENT = "AGENT"
    SYSTEM_TRIGGER = "SYSTEM_TRIGGER"


class TriggerType(str, Enum):
    """伴读触发模式枚举"""
    DISCUSS = "DISCUSS"
    CHAPTER_END_95 = "CHAPTER_END_95"


@dataclass
class DiscussMessage(BaseEntity):
    """DiscussMessage 伴读消息实体"""
    session_id: str = ""
    sender_type: SenderType = SenderType.USER
    content: str = ""
    action_cards: List[Dict[str, Any]] = field(default_factory=list)
    source_anchor_id: Optional[str] = None
    trigger_type: TriggerType = TriggerType.DISCUSS


@dataclass
class CompanionSession(BaseEntity):
    """CompanionSession 伴读会话实体"""
    project_id: str = ""
    book_id: str = ""
    agent_id: str = ""
    status: SessionStatus = SessionStatus.ACTIVE
    messages: List[DiscussMessage] = field(default_factory=list)
