"""Prompt 构建工厂模块"""

import re
from functools import lru_cache
from pathlib import Path
from app.domain.agent.entities import AgentMode, TriggerType, PromptContext

# 获取 prompt 目录的物理路径
PROMPT_DIR = Path(__file__).parent


@lru_cache(maxsize=16)
def _load_prompt_template(filename: str) -> str:
    """从本地读取文本模版"""
    path = PROMPT_DIR / filename
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    return ""


# 静态加载缓存各业务场景的 Markdown 模板文本
COMPANION_CHAPTER_END_TEMPLATE = _load_prompt_template(
    "reading_companion_chapter_end.md"
)
COMPANION_USER_ACTIVE_TEMPLATE = _load_prompt_template(
    "reading_companion_user_active.md"
)
BREAKDOWN_TEMPLATE = _load_prompt_template("task_breakdown.md")


class PromptFactory:
    """Agent 领域 Prompt 组装工厂"""

    @staticmethod
    def create_prompt(
        mode: AgentMode,
        trigger_type: TriggerType,
        context: PromptContext,
    ) -> str:
        """根据 AgentMode 与 TriggerType 动态组装 Prompt"""
        # 统一提取参数默认值，并将 None 值替换为空白字符串，以便 format 替换
        args = {
            "skill_instruction": context.skill_instruction or "",
            "chapter_summary": context.chapter_summary or "",
            "selected_text": context.selected_text or "",
            "context_blocks": (
                "\n".join([str(b) for b in context.neighbor_blocks[:3]])
                if context.neighbor_blocks
                else ""
            ),
            "user_content": context.user_content or "",
        }

        # 根据模式选择对应的模板
        if mode == AgentMode.READING_COMPANION:
            if trigger_type == TriggerType.CHAPTER_END_95:
                template = COMPANION_CHAPTER_END_TEMPLATE
            else:
                template = COMPANION_USER_ACTIVE_TEMPLATE
        elif mode == AgentMode.TASK_BREAKDOWN:
            template = BREAKDOWN_TEMPLATE
        else:
            raise ValueError(f"Unsupported agent mode: {mode}")

        if not template:
            return ""

        # 使用 Python 原生 format 进行占位符插值填充
        prompt = template.format(**args)

        # 智能正则匹配并清除无填充数据的空标题区块
        # 1. 匹配双引号包裹的空块，如: 【用户选中文本】：\n""
        prompt = re.sub(r'【[^】]+】：\s*\n*""\s*\n*', "", prompt)
        # 2. 匹配其余空字段标题，如: 【当前章节概要】：\n 后面紧跟着换行或结束
        prompt = re.sub(r"【[^】]+】：\s*\n+(?=\n|【|$)", "", prompt)

        # 规整多余的连续换行符
        prompt = re.sub(r"\n{3,}", "\n\n", prompt)
        return prompt.strip()
