"""统一 Agent 领域实体模块 (Agent Domain Entities)"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional
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
    CARD_INTERACTION = "CARD_INTERACTION"


class CardStatus(str, Enum):
    """Action Card 履约状态枚举"""
    PENDING = "PENDING"
    INTERACTED = "INTERACTED"
    EXPIRED = "EXPIRED"


class CardType(str, Enum):
    """Action Card 类型枚举"""
    KNOWLEDGE = "KNOWLEDGE"
    THINKING_PROMPT = "THINKING_PROMPT"
    SUMMARY = "SUMMARY"


@dataclass
class ActionCard:
    """Action Card 领域实体"""
    card_id: str
    card_type: str
    title: str
    content: str
    payload: Dict[str, Any]
    status: CardStatus = CardStatus.PENDING
    user_response: Optional[Dict[str, Any]] = None

    def mark_interacted(self, user_response: Optional[Dict[str, Any]] = None) -> None:
        """标记卡片履约被交互"""
        self.status = CardStatus.INTERACTED
        if user_response is not None:
            self.user_response = user_response

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典用于持久化/传输"""
        return {
            "card_id": self.card_id,
            "card_type": self.card_type if isinstance(self.card_type, str) else self.card_type.value,
            "title": self.title,
            "content": self.content,
            "payload": self.payload or {},
            "status": self.status.value if isinstance(self.status, Enum) else self.status,
            "user_response": self.user_response,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ActionCard":
        """从字典反序列化构建领域实体"""
        raw_status = data.get("status", CardStatus.PENDING.value)
        status = CardStatus(raw_status) if raw_status in CardStatus._value2member_map_ else CardStatus.PENDING
        return cls(
            card_id=data.get("card_id", ""),
            card_type=data.get("card_type", ""),
            title=data.get("title", ""),
            content=data.get("content", ""),
            payload=data.get("payload") or {},
            status=status,
            user_response=data.get("user_response"),
        )


@dataclass(frozen=True)
class PromptContext:
    """Agent 拼装 Prompt 所需的上下文数据值对象"""
    user_content: str
    project_id: Optional[str] = None
    skill_instruction: Optional[str] = None
    selected_text: Optional[str] = None
    chapter_summary: Optional[str] = None
    neighbor_blocks: Optional[List[Any]] = None
    card_id: Optional[str] = None
    card_response: Optional[Dict[str, Any]] = None
    message_id: Optional[str] = None

    def to_template_args(self) -> dict:
        """将上下文参数转为用于模板字符串格式化的字典（自动补充默认空串）"""
        import json
        return {
            "project_id": self.project_id or "",
            "skill_instruction": self.skill_instruction or "",
            "chapter_summary": self.chapter_summary or "",
            "selected_text": self.selected_text or "",
            "context_blocks": (
                "\n".join([str(b) for b in self.neighbor_blocks[:3]])
                if self.neighbor_blocks
                else ""
            ),
            "user_content": self.user_content or "",
            "card_id": self.card_id or "",
            "card_response_json": json.dumps(self.card_response, ensure_ascii=False) if self.card_response else "",
        }



