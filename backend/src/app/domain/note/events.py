"""笔记与知识库领域事件模块"""

from dataclasses import dataclass
from typing import Optional
from app.domain.events import DomainEvent


@dataclass
class MaterialNoteCreatedEvent(DomainEvent):
    """素材笔记捕获成功事件"""
    note_id: str = ""
    project_id: str = ""
    task_id: str = ""
    source_type: str = ""


@dataclass
class SynthesizedNoteCreatedEvent(DomainEvent):
    """常规沉淀笔记合并落盘成功事件"""
    note_id: str = ""
    project_id: str = ""
    knowledge_base_id: Optional[str] = None
    file_path: str = ""


@dataclass
class MaterialNoteDeletedEvent(DomainEvent):
    """素材笔记删除事件"""
    note_id: str = ""


@dataclass
class SynthesizedNoteDeletedEvent(DomainEvent):
    """沉淀/经验笔记删除事件"""
    note_id: str = ""
    project_id: str = ""
    file_path: str = ""
