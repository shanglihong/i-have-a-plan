"""项目与任务领域事件模块"""

from dataclasses import dataclass
from app.domain.common.events import DomainEvent


@dataclass
class ProjectArchived(DomainEvent):
    """项目结项归档领域事件"""
    project_id: str = ""


@dataclass
class TaskStatusChanged(DomainEvent):
    """任务状态变更领域事件"""
    task_id: str = ""
    old_status: str = ""
    new_status: str = ""
