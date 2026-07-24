"""AI 伴读领域服务模块 (Domain Services)"""

from typing import Any, Dict, Optional
from app.domain.companion.entities import DiscussMessage, TriggerType


class ContextBuilderService:
    """分层 Dynamic Context 组装器领域服务"""

    @staticmethod
    def build_prompt(
        trigger_type: TriggerType,
        user_content: str,
        selected_text: Optional[str] = None,
        chapter_summary: Optional[str] = None,
        neighbor_blocks: Optional[list] = None,
    ) -> str:
        """根据触发类型组装分层 Prompt 上下文"""
        prompt_parts = ["你是一位专业的书本 AI 伴读导师 (Reading Companion)。"]
        
        if chapter_summary:
            prompt_parts.append(f"【当前章节概要】：\n{chapter_summary}")

        if selected_text:
            prompt_parts.append(f"【用户选中文本】：\n\"{selected_text}\"")

        if neighbor_blocks:
            context_blocks = "\n".join([str(b) for b in neighbor_blocks[:3]])
            prompt_parts.append(f"【上下文段落】：\n{context_blocks}")

        if trigger_type == TriggerType.CHAPTER_END_95:
            prompt_parts.append(
                "【触发场景】：用户已阅读至本章末尾 95% 位置。请针对本章核心考点，总结一段简短的启发式小结，并生成 1 个费曼重述测试问题。"
            )
        else:
            prompt_parts.append(f"【用户提问/探讨内容】：\n{user_content}")

        prompt_parts.append(
            "【输出要求】：请清晰解答，并在最后附带结构化的 Action Cards，以便用户一键转存笔记或进行卡片测试。"
        )
        return "\n\n".join(prompt_parts)


class NoteConversionService:
    """伴读对话转思考笔记 (MaterialNote) 领域服务"""

    @staticmethod
    def prepare_material_note_data(
        discuss_msg: DiscussMessage, user_paraphrase: str
    ) -> Dict[str, Any]:
        """将 DiscussMessage 解构并组装为 MaterialNote 的创建字典包"""
        return {
            "discuss_message_id": discuss_msg.id,
            "source_type": "COMPANION_CONVERTED",
            "paraphrase": user_paraphrase or discuss_msg.content,
            "original_snippet": discuss_msg.content,
            "source_anchor_id": discuss_msg.source_anchor_id,
        }
