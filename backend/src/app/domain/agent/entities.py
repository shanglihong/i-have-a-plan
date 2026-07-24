"""统一 Agent 领域实体模块 (Agent Domain Entities)"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
from app.domain.common.base_entity import BaseEntity


class SessionStatus(str, Enum):
    """Agent 会话状态枚举"""
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class AgentMode(str, Enum):
    """Agent 业务工作模式枚举"""
    READING_COMPANION = "READING_COMPANION"
    TASK_BREAKDOWN = "TASK_BREAKDOWN"


class SenderType(str, Enum):
    """消息发送方枚举"""
    USER = "USER"
    AGENT = "AGENT"
    SYSTEM_TRIGGER = "SYSTEM_TRIGGER"


class TriggerType(str, Enum):
    """触发模式枚举"""
    DISCUSS = "DISCUSS"
    CHAPTER_END_95 = "CHAPTER_END_95"
    USER_PROMPT = "USER_PROMPT"


@dataclass
class AgentMessage(BaseEntity):
    """Agent 对话消息实体"""
    session_id: str = ""
    sender_type: SenderType = SenderType.USER
    content: str = ""
    action_cards: List[Dict[str, Any]] = field(default_factory=list)
    source_anchor_id: Optional[str] = None
    trigger_type: TriggerType = TriggerType.DISCUSS


@dataclass
class AgentSession(BaseEntity):
    """Agent 会话聚合根实体"""
    project_id: str = ""
    book_id: Optional[str] = None
    task_id: Optional[str] = None
    agent_id: str = ""
    skill_id: Optional[str] = None
    mode: AgentMode = AgentMode.READING_COMPANION
    status: SessionStatus = SessionStatus.ACTIVE
    messages: List[AgentMessage] = field(default_factory=list)
