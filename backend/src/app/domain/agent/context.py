"""Agent 领域场景上下文值对象模块 (Agent Context Value Objects)"""

import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class BaseAgentContext:
    """Agent 拼装 Prompt 所需上下文基类值对象"""
    user_content: str = ""

    def to_template_args(self) -> dict:
        """格式化为模版替换字典"""
        return {"user_content": self.user_content}


@dataclass(frozen=True)
class GeneralChatContext(BaseAgentContext):
    """通用对话上下文"""
    pass


@dataclass(frozen=True)
class ReadingCompanionContext(BaseAgentContext):
    """伴读划词/章节阅读上下文"""
    selected_text: Optional[str] = None
    chapter_summary: Optional[str] = None
    neighbor_blocks: Optional[List[Any]] = None

    def to_template_args(self) -> dict:
        args = super().to_template_args()
        args.update({
            "selected_text": self.selected_text or "",
            "chapter_summary": self.chapter_summary or "",
            "context_blocks": (
                "\n".join([str(b) for b in self.neighbor_blocks[:3]])
                if self.neighbor_blocks
                else ""
            ),
        })
        return args


@dataclass(frozen=True)
class CardInteractionContext(BaseAgentContext):
    """卡片交互履约上下文"""
    card_id: str = ""
    card_response: Optional[Dict[str, Any]] = None
    message_id: Optional[str] = None

    def to_template_args(self) -> dict:
        args = super().to_template_args()
        args.update({
            "card_id": self.card_id,
            "card_response_json": json.dumps(self.card_response, ensure_ascii=False) if self.card_response else "",
        })
        return args


@dataclass(frozen=True)
class TaskBreakdownContext(BaseAgentContext):
    """任务拆解上下文"""
    project_id: Optional[str] = None
    skill_instruction: Optional[str] = None

    def to_template_args(self) -> dict:
        args = super().to_template_args()
        args.update({
            "project_id": self.project_id or "",
            "skill_instruction": self.skill_instruction or "",
        })
        return args
