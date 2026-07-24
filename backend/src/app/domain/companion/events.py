"""AI 伴读领域事件模块"""

from dataclasses import dataclass
from app.domain.common.base_event import BaseEvent


@dataclass
class CompanionMessageSentEvent(BaseEvent):
    """伴读消息已发送事件"""
    session_id: str = ""
    message_id: str = ""
    sender_type: str = ""


@dataclass
class NoteConvertedFromMessageEvent(BaseEvent):
    """伴读消息转笔记完成事件"""
    message_id: str = ""
    note_id: str = ""
    project_id: str = ""
