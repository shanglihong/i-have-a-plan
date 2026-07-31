"""统一 Agent 领域事件模块"""

from dataclasses import dataclass
from app.domain.events import DomainEvent


@dataclass
class AgentMessageSentEvent(DomainEvent):
    """Agent 消息已发送事件"""
    session_id: str = ""
    message_id: str = ""
    sender_type: str = ""
    mode: str = ""


@dataclass
class TaskTreeGeneratedEvent(DomainEvent):
    """Agent 自动生成任务树事件"""
    project_id: str = ""
    session_id: str = ""
    task_chain_count: int = 0


@dataclass
class AgentSessionTerminatedEvent(DomainEvent):
    """Agent 会话销毁/终止领域事件"""
    session_id: str = ""
    project_id: str = ""
