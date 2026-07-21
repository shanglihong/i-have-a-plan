"""
应用级防腐接口 - LLM Port

定义应用层与大模型通信的抽象契约。
实现方（LangChain 适配器）位于基础设施层，通过依赖注入在运行时替换。
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMPort(ABC):
    """大模型通信接口 (Application Port)"""

    @abstractmethod
    async def stream_chat(self, prompt: str) -> AsyncIterator[str]:
        """
        流式对话，返回 AsyncIterator 逐 Token 推送。
        用于接入层 SSE 响应。
        """
        ...

    @abstractmethod
    async def chat(self, prompt: str) -> str:
        """
        一次性对话，返回完整响应文本。
        用于后台守护任务（图谱构建、技能提炼）。
        """
        ...
