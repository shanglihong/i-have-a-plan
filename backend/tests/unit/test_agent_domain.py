"""
领域层单元测试 - 统一 Agent 领域与沙箱上下文

测试 Agent 领域的核心逻辑：
1. ContextBuilderService 多模式 Prompt 组装 (READING_COMPANION / TASK_BREAKDOWN)
2. TaskTreeParserService 任务树 JSON 提取与解析
3. NoteConversionService 对话转思考笔记组装
"""
from __future__ import annotations

import pytest
from app.domain.agent.entities import (
    AgentMessage,
    AgentMode,
    AgentSession,
    SenderType,
    TriggerType,
)
from app.domain.agent.services import (
    ContextBuilderService,
    NoteConversionService,
    TaskTreeParserService,
)


class TestContextBuilderService:
    """ContextBuilder 动态 Prompt 组装测试套件"""

    def test_build_companion_prompt_with_skill(self) -> None:
        """验证伴读模式下挂载 Skill 指令的 Prompt 组装"""
        prompt = ContextBuilderService.build_prompt(
            mode=AgentMode.READING_COMPANION,
            trigger_type=TriggerType.DISCUSS,
            user_content="请解释这个算法的收敛性推导",
            skill_instruction="【技能】：深度学习论文精读指引",
            selected_text="收敛速度证明定理如下",
            chapter_summary="本章讲述优化算法收敛性证明",
        )

        assert "电子书 AI 伴读导师" in prompt
        assert "【挂载技能指令】" in prompt
        assert "深度学习论文精读指引" in prompt
        assert "收敛速度证明定理如下" in prompt

    def test_build_task_breakdown_prompt(self) -> None:
        """验证 Task 自动拆解模式的 Prompt 组装"""
        prompt = ContextBuilderService.build_prompt(
            mode=AgentMode.TASK_BREAKDOWN,
            trigger_type=TriggerType.USER_PROMPT,
            user_content="在 2 周内完成 Go 语言微服务开发实战",
            skill_instruction="【技能】：Go 语言学习路线图模板",
        )

        assert "精通项目管理与目标拆解的 AI 监督导学 Agent" in prompt
        assert "Go 语言学习路线图模板" in prompt
        assert "JSON 格式的任务树" in prompt


class TestTaskTreeParserService:
    """TaskTreeParser 解析测试套件"""

    def test_parse_task_tree_json_success(self) -> None:
        """验证从 LLM Markdown 包含文本中提取格式正确的 JSON 任务树"""
        raw_llm_output = """
        为你拆解了项目任务树：
        ```json
        {
          "task_chains": [
            {
              "title": "阶段 1：基础语法",
              "tasks": [{"title": "阅读第 1-3 章", "deadline_days": 2}]
            }
          ]
        }
        ```
        请确认是否符合预期。
        """

        chains = TaskTreeParserService.parse_task_tree_json(raw_llm_output)
        assert len(chains) == 1
        assert chains[0]["title"] == "阶段 1：基础语法"
        assert len(chains[0]["tasks"]) == 1


class TestNoteConversionService:
    """Agent Message 转思考笔记测试套件"""

    def test_prepare_material_note_data(self) -> None:
        """验证 AgentMessage 转换为 MaterialNote 的键值结构"""
        msg = AgentMessage(
            id="msg-200",
            session_id="sess-agent-1",
            sender_type=SenderType.AGENT,
            content="梯度爆炸主要是因为深层网络中权重的连续放大效应。",
            source_anchor_id="anchor-88",
            trigger_type=TriggerType.DISCUSS,
        )

        note_data = NoteConversionService.prepare_material_note_data(
            agent_msg=msg,
            user_paraphrase="伴读解答：梯度爆炸的原理主要是连续乘积放大。",
        )

        assert note_data["discuss_message_id"] == "msg-200"
        assert note_data["source_type"] == "COMPANION_CONVERTED"
        assert note_data["source_anchor_id"] == "anchor-88"
        assert note_data["paraphrase"] == "伴读解答：梯度爆炸的原理主要是连续乘积放大。"
