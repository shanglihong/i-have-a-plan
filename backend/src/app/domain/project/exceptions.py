"""项目与任务领域异常体系 (遵循自描述 RFC 7807 协议)"""

from app.domain.exceptions import DomainException


class ProjectDomainException(DomainException):
    """项目领域基类异常"""

    error_type: str = "project-domain-error"
    title: str = "Project Domain Error"
    status_code: int = 400

    def __init__(self, message: str, error_code: str = "PROJECT_DOMAIN_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(
            detail=message,
            extension_fields={"error_code": error_code},
        )


class CyclicDependencyException(ProjectDomainException):
    """依赖环路检测异常"""

    error_type: str = "task-cyclic-dependency"
    title: str = "Task Cyclic Dependency"
    status_code: int = 400

    def __init__(self, message: str = "Task 依赖图中检测出环路"):
        super().__init__(message, error_code="TASK_CYCLIC_DEPENDENCY")


class TaskBlockedException(ProjectDomainException):
    """任务依赖被锁死异常"""

    error_type: str = "task-dependency-blocked"
    title: str = "Task Dependency Blocked"
    status_code: int = 409

    def __init__(self, message: str = "前置依赖未完成，任务处于锁定状态"):
        super().__init__(message, error_code="TASK_DEPENDENCY_BLOCKED")


class TaskNotFoundException(ProjectDomainException):
    """任务未找到异常"""

    error_type: str = "task-not-found"
    title: str = "Task Not Found"
    status_code: int = 404

    def __init__(self, task_id: str):
        super().__init__(f"未找到任务: {task_id}", error_code="TASK_NOT_FOUND")


class InvalidTaskStateTransitionException(ProjectDomainException):
    """任务状态转移非法异常"""

    error_type: str = "task-state-transition-blocked"
    title: str = "Task State Transition Blocked"
    status_code: int = 409

    def __init__(self, current_status: str, target_status: str, detail: str = ""):
        msg = f"不允许的任务状态转移: [{current_status}] -> [{target_status}]"
        if detail:
            msg += f" ({detail})"
        super().__init__(msg, error_code="TASK_STATE_TRANSITION_BLOCKED")


class DuplicateNoteAttachmentException(ProjectDomainException):
    """素材笔记重复挂载异常"""

    error_type: str = "duplicate-note-attachment"
    title: str = "Duplicate Note Attachment"
    status_code: int = 400

    def __init__(self, task_id: str, note_id: str):
        super().__init__(
            f"笔记 {note_id} 已经挂载到任务 {task_id} 上，不可重复挂载",
            error_code="DUPLICATE_NOTE_ATTACHMENT",
        )
