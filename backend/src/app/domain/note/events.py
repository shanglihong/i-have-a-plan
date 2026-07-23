"""笔记与知识库领域事件模块"""

from dataclasses import dataclass
from app.domain.common.events import DomainEvent


@dataclass
class NoteCreated(DomainEvent):
    """笔记创建领域事件"""
    note_id: str = ""
    is_synthesized: bool = False


@dataclass
class NoteUpdated(DomainEvent):
    """笔记更新领域事件"""
    note_id: str = ""
