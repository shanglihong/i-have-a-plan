"""统一 Agent 领域实体模块 (Agent Domain Entities)"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, List, Optional
from app.domain.base import BaseEntity


class SessionStatus(str, Enum):
    """Agent 会话状态枚举"""
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    TERMINATED = "TERMINATED"


class AgentMode(str, Enum):
    """Agent 业务工作模式枚举"""
    READING_COMPANION = "READING_COMPANION"
    TASK_BREAKDOWN = "TASK_BREAKDOWN"


@dataclass
class AgentSession(BaseEntity):
    """Agent 会话聚合根实体"""
    project_id: str = ""
    book_id: Optional[str] = None
    task_id: Optional[str] = None
    agent_id: str = ""
    skill_id: Optional[str] = None
    mode: AgentMode = AgentMode.READING_COMPANION
    status: SessionStatus = SessionStatus.IDLE

    def can_transition_to(self, target: SessionStatus) -> bool:
        """根据设计规范的状态跳转矩阵，校验当前状态是否可以转移到 target"""
        if self.status == target:
            return True
        if self.status == SessionStatus.TERMINATED:
            return False

        allowed = {
            SessionStatus.IDLE: [SessionStatus.RUNNING, SessionStatus.TERMINATED],
            SessionStatus.RUNNING: [SessionStatus.IDLE, SessionStatus.PAUSED, SessionStatus.TERMINATED],
            SessionStatus.PAUSED: [SessionStatus.IDLE, SessionStatus.RUNNING, SessionStatus.TERMINATED],
        }
        return target in allowed.get(self.status, [])

    def _transition_to(self, target: SessionStatus) -> None:
        """内部状态扭转方法"""
        from app.domain.agent.exceptions import StateTransitionException
        if not self.can_transition_to(target):
            raise StateTransitionException(
                f"无法从状态 {self.status.value} 转移到 {target.value}"
            )
        self.status = target

    def start_chat(self) -> None:
        """收到 Chat 请求，开始运行对话"""
        self._transition_to(SessionStatus.RUNNING)

    def complete_chat(self) -> None:
        """流式对话完成，回归闲置状态"""
        self._transition_to(SessionStatus.IDLE)

    def pause(self) -> None:
        """用户主动中断，进入暂停状态"""
        self._transition_to(SessionStatus.PAUSED)

    def hibernate(self) -> None:
        """长期无交互自动休眠"""
        self._transition_to(SessionStatus.HIBERNATED)

    def terminate(self) -> None:
        """异常熔断或项目销毁，终止会话"""
        self._transition_to(SessionStatus.TERMINATED)


class TriggerType(str, Enum):
    """Agent 对话交互触发类型"""
    CHAPTER_END_95 = "CHAPTER_END_95"
    USER_ACTIVE = "USER_ACTIVE"


@dataclass(frozen=True)
class PromptContext:
    """Agent 拼装 Prompt 所需的上下文数据值对象"""
    user_content: str
    skill_instruction: Optional[str] = None
    selected_text: Optional[str] = None
    chapter_summary: Optional[str] = None
    neighbor_blocks: Optional[List[Any]] = None



