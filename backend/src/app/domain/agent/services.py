"""统一 Agent 领域服务模块 (Domain Services)"""

import json
from typing import Any, Dict, List, Optional
from app.domain.agent.entities import AgentMessage, AgentMode, TriggerType


class ContextBuilderService:
    """统一分层 Dynamic Context 与 Skill 组装领域服务"""

    @staticmethod
    def build_prompt(
        mode: AgentMode,
        trigger_type: TriggerType,
        user_content: str,
        skill_instruction: Optional[str] = None,
        selected_text: Optional[str] = None,
        chapter_summary: Optional[str] = None,
        neighbor_blocks: Optional[list] = None,
    ) -> str:
        """根据 AgentMode 动态组装上下文及 Skill 提示词"""
        prompt_parts = []

        if mode == AgentMode.READING_COMPANION:
            prompt_parts.append("你是一位专业的电子书 AI 伴读导师 (Reading Companion)。")
            if skill_instruction:
                prompt_parts.append(f"【挂载技能指令】：\n{skill_instruction}")
            if chapter_summary:
                prompt_parts.append(f"【当前章节概要】：\n{chapter_summary}")
            if selected_text:
                prompt_parts.append(f"【用户选中文本】：\n\"{selected_text}\"")
            if neighbor_blocks:
                context_blocks = "\n".join([str(b) for b in neighbor_blocks[:3]])
                prompt_parts.append(f"【上下文段落】：\n{context_blocks}")

            if trigger_type == TriggerType.CHAPTER_END_95:
                prompt_parts.append(
                    "【触发场景】：用户已阅读至本章末尾 95% 位置。请针对本章核心考点，总结一则简短的启发式小结，并生成 1 个费曼重述测试问题。"
                )
            else:
                prompt_parts.append(f"【用户提问/探讨内容】：\n{user_content}")

            prompt_parts.append(
                "【输出要求】：请清晰解答，并在最后附带结构化的 Action Cards，以便用户一键转存笔记或进行重述测试。"
            )

        elif mode == AgentMode.TASK_BREAKDOWN:
            prompt_parts.append("你是一位精通项目管理与目标拆解的 AI 监督导学 Agent。")
            if skill_instruction:
                prompt_parts.append(f"【挂载技能模板】：\n{skill_instruction}")
            prompt_parts.append(f"【用户项目目标描述】：\n{user_content}")
            prompt_parts.append(
                "【输出要求】：请先用简短的语言说明拆解思路，最后务必输出一个 JSON 格式的任务树，包含 TaskChain 阶段与 Task 微观步骤列表。"
            )

        return "\n\n".join(prompt_parts)


class TaskTreeParserService:
    """Task 结构化 JSON 解析与校验服务"""

    @staticmethod
    def parse_task_tree_json(json_str: str) -> List[Dict[str, Any]]:
        """从 Agent 响应文本中提取并解析 JSON 任务树"""
        try:
            start_idx = json_str.find("{")
            end_idx = json_str.rfind("}") + 1
            if start_idx != -1 and end_idx != 0:
                clean_json = json_str[start_idx:end_idx]
                data = json.loads(clean_json)
                return data.get("task_chains", [])
        except Exception:
            pass
        return []


class NoteConversionService:
    """Agent 对话转思考笔记 (MaterialNote) 领域服务"""

    @staticmethod
    def prepare_material_note_data(
        agent_msg: AgentMessage, user_paraphrase: str
    ) -> Dict[str, Any]:
        """将 AgentMessage 解构并组装为 MaterialNote 的创建字典包"""
        return {
            "discuss_message_id": agent_msg.id,
            "source_type": "COMPANION_CONVERTED",
            "paraphrase": user_paraphrase or agent_msg.content,
            "original_snippet": agent_msg.content,
            "source_anchor_id": agent_msg.source_anchor_id,
        }
