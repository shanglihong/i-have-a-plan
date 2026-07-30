"""统一 Agent 领域异常定义模块 (自描述 Domain Exceptions)"""

from app.domain.exceptions import DomainException


class AgentSessionNotFoundException(DomainException):
    """会话未找到异常"""
    error_type = "AGENT_SESSION_NOT_FOUND"
    title = "Agent Session Not Found"
    status_code = 404



class SandboxPermissionViolationException(DomainException):
    """沙箱越权或安全规则违背异常"""
    error_type = "SANDBOX_PERMISSION_VIOLATION"
    title = "Sandbox Permission Violation"
    status_code = 403


class SandboxTimeoutException(DomainException):
    """沙箱执行超时异常"""
    error_type = "SANDBOX_TIMEOUT"
    title = "Sandbox Timeout"
    status_code = 504


class InvalidSkillTemplateException(DomainException):
    """无效技能模板异常"""
    error_type = "INVALID_SKILL_TEMPLATE"
    title = "Invalid Skill Template"
    status_code = 400


class StateTransitionException(DomainException):
    """状态跳转不合法异常"""
    error_type = "AGENT_STATE_TRANSITION_FAILED"
    title = "Agent State Transition Failed"
    status_code = 400
