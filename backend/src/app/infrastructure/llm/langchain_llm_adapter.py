"""
基础设施层 - LangChain LLM 适配器

实现 application/ports/llm_port.py 中定义的 LLMPort 接口。
依赖 LangChain + LangGraph 进行实际大模型调用。
骨架阶段提供可替换的 Mock 实现，待真实 API Key 配置后替换。
"""
from __future__ import annotations

from typing import AsyncIterator

from app.application.ports.llm_port import LLMPort


class LangChainLLMAdapter(LLMPort):
    """
    LangChain LLM 适配器（真实实现骨架）

    TODO: 在 config.py 中配置 OPENAI_API_KEY 等凭证后，
          将以下 _stream_mock 替换为真实 LangChain 调用。
    """

    def __init__(self, model_name: str = "gpt-4o-mini") -> None:
        self._model_name = model_name
        # TODO: self._llm = ChatOpenAI(model=model_name, streaming=True)

    async def stream_chat(self, prompt: str) -> AsyncIterator[str]:
        """
        流式对话（骨架：Mock 实现，逐字符返回）
        接入真实模型时替换此方法。
        """
        # Mock 实现：模拟逐 Token 返回
        mock_response = f"[Mock LLM] 已收到提示词，模型: {self._model_name}"
        for char in mock_response:
            yield char

    async def chat(self, prompt: str) -> str:
        """一次性对话（骨架：Mock 实现）"""
        return f"[Mock LLM] 已收到提示词，模型: {self._model_name}"
