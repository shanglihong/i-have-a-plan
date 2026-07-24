"""
领域层单元测试 - 伴读与沙箱 Agent 上下文

测试纯伴读领域逻辑，包含：
1. ContextBuilderService 分层 Prompt 组装策略 (划词解惑 / 章节末尾 95% 触发)
2. NoteConversionService 伴读对话转思考笔记 (MaterialNote) 数据组装
"""
from __future__ import annotations

import pytest
from app.domain.companion.entities import (
    CompanionSession,
    DiscussMessage,
    SenderType,
    SessionStatus,
    TriggerType,
)
from app.domain.companion.services import ContextBuilderService, NoteConversionService


class TestContextBuilderService:
    """ContextBuilder 动态 Prompt 组装测试套件"""

    def test_build_discuss_prompt(self) -> None:
        """验证划词 Discuss 被动提问的 Prompt 组装"""
        prompt = ContextBuilderService.build_prompt(
            trigger_type=TriggerType.DISCUSS,
            user_content="请解释这个反向传播推导",
            selected_text="链式法则展开如下",
            chapter_summary="本章主要讲述神经网络模型",
            neighbor_blocks=["Block 101: 基础参数定义", "Block 102: 损失函数"],
        )

        assert "书本 AI 伴读导师" in prompt
        assert "【当前章节概要】" in prompt
        assert "【用户选中文本】" in prompt
        assert "【上下文段落】" in prompt
        assert "【用户提问/探讨内容】" in prompt
        assert "请解释这个反向传播推导" in prompt

    def test_build_chapter_end_95_prompt(self) -> None:
        """验证章节末尾 95% 滚动检测的主动引导 Prompt 组装"""
        prompt = ContextBuilderService.build_prompt(
            trigger_type=TriggerType.CHAPTER_END_95,
            user_content="",
            chapter_summary="本章主要讲述梯度下降法与网络优化",
        )

        assert "用户已阅读至本章末尾 95% 位置" in prompt
        assert "【当前章节概要】" in prompt
        assert "费曼重述测试问题" in prompt


class TestNoteConversionService:
    """伴读对话转思考笔记测试套件"""

    def test_prepare_material_note_data(self) -> None:
        """验证 DiscussMessage 转换为 MaterialNote 的键值构造"""
        msg = DiscussMessage(
            id="msg-100",
            session_id="sess-1",
            sender_type=SenderType.AGENT,
            content="梯度消失的主要原因是权重连续小于 1 的累乘效应。",
            source_anchor_id="anchor-55",
            trigger_type=TriggerType.DISCUSS,
        )

        note_data = NoteConversionService.prepare_material_note_data(
            discuss_msg=msg,
            user_paraphrase="伴读解答：梯度消失来自于权重的不断相乘。",
        )

        assert note_data["discuss_message_id"] == "msg-100"
        assert note_data["source_type"] == "COMPANION_CONVERTED"
        assert note_data["source_anchor_id"] == "anchor-55"
        assert note_data["paraphrase"] == "伴读解答：梯度消失来自于权重的不断相乘。"
        assert note_data["original_snippet"] == "梯度消失的主要原因是权重连续小于 1 的累乘效应。"
