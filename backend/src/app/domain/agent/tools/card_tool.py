"""通用 Action Card 呈现 Agent 工具模块"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from app.domain.agent.entities import ActionCard, CardStatus


class CardInput(BaseModel):
    """卡片展示结构化输入数据模型"""

    card_type: str = Field(
        ...,
        description="卡片类型，例如 KNOWLEDGE (知识拓展卡), THINKING_PROMPT (思考互动卡), SUMMARY (阶段总结卡)",
    )
    title: str = Field(..., description="卡片主标题，需简明扼要")
    content: str = Field(..., description="卡片核心展示正文内容（支持 Markdown 语法）")
    payload: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="卡片附加拓展数据（如关联切片 ID block_id、互动选项列表等）",
    )


def make_present_card_tool():
    """工厂：创建通用卡片展示 Tool"""

    @tool
    async def present_card(
        card_type: str,
        title: str,
        content: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """【AI Tool】在对话中向用户界面实时推送呈现卡片。

        [调用场景与触发条件]
        - 当在阅读辅导或对话过程中，需要突出呈现特定知识点概念（KNOWLEDGE）、提出深度思考问题与互动提问（THINKING_PROMPT）、提供阶段总结（SUMMARY）时调用。
        - 调用此工具会在用户侧直接弹出一张高亮展示/交互卡片。

        Args:
            card_type: 卡片类型（如 "KNOWLEDGE", "THINKING_PROMPT", "SUMMARY"）。
            title: 卡片标题。
            content: 卡片详细说明正文（支持 Markdown）。
            payload: 卡片扩展数据字段字典（可选）。

        Returns:
            Dict[str, Any]: 包含卡片核心字段的结构化字典。
        """
        import uuid

        card_entity = ActionCard(
            card_id=f"card_{uuid.uuid4().hex[:8]}",
            card_type=card_type,
            title=title,
            content=content,
            payload=payload or {},
            status=CardStatus.PENDING,
        )
        return card_entity.to_dict()

    return present_card
