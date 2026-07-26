"""Project 与 Task 领域服务包导出模块"""

from .project_creation_service import ProjectCreationDomainService
from .project_state_service import ProjectStateDomainService
from .project_query_service import ProjectQueryDomainService
from .task_query_service import TaskQueryDomainService
from .task_operation_service import TaskOperationDomainService
from .experience_note_service import ExperienceNoteDomainService
from .healing_service import StartupHealingThread

# 向后兼容别名
ProjectDomainService = TaskQueryDomainService

__all__ = [
    "ProjectCreationDomainService",
    "ProjectStateDomainService",
    "ProjectQueryDomainService",
    "TaskQueryDomainService",
    "TaskOperationDomainService",
    "ExperienceNoteDomainService",
    "ProjectDomainService",
    "StartupHealingThread",
]
