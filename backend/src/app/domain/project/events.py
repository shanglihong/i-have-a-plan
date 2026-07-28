"""项目与任务领域事件模块"""

from typing import List
from dataclasses import dataclass, field
from app.domain.events import DomainEvent


@dataclass
class ProjectParseFailedEvent(DomainEvent):
    """电子书解析失败或坏损领域事件"""
    project_id: str = ""
    reason: str = ""


@dataclass
class ProjectCreatedEvent(DomainEvent):
    """项目创建就绪领域事件"""
    project_id: str = ""
    project_type: str = ""
    status: str = ""
    

@dataclass
class ProjectStatusChangedEvent(DomainEvent):
    """项目生命周期状态变迁领域事件"""
    project_id: str = ""
    old_status: str = ""
    new_status: str = ""


@dataclass
class ProjectArchivedEvent(DomainEvent):
    """项目结项归档领域事件"""
    project_id: str = ""


@dataclass
class ProjectDeleteEvent(DomainEvent):
    project_id: str = ""

@dataclass
class TaskDeleteEvent(DomainEvent):
    task_chain_ids: List[str] = field(default_factory=list)
    task_ids: List[str] = field(default_factory=list)


@dataclass
class ExperienceNoteCreatedEvent(DomainEvent):
    """归档项目生成经验笔记领域事件"""
    project_id: str = ""
    task_chain_id: str = ""


@dataclass
class TaskStatusChangedEvent(DomainEvent):
    """任务状态变更领域事件"""
    task_id: str = ""
    old_status: str = ""
    new_status: str = ""

@dataclass
class TaskTreeCreatedEvent(DomainEvent):
    """任务树构建就绪领域事件"""
    project_id: str = ""


@dataclass
class TaskUnlockedEvent(DomainEvent):
    """任务解锁就绪领域事件"""
    unlocked_task_ids: List[str] = field(default_factory=list)


@dataclass
class TaskStatusChangedEvent(DomainEvent):
    """状态变迁事件"""
    task_id: str = ""
    status: str = ""


