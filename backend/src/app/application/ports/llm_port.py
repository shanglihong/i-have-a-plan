"""应用层大模型防腐接口 (LLM Port) 模块"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any, List


class LLMPort(ABC):
    """LLMPort 大模型通信防腐契约接口 (支持 LangChain / LangGraph)"""

    @abstractmethod
    async def generate_response(self, prompt: str, context: Dict[str, Any]) -> str:
        """同步/单次 LLM 响应生成"""
        pass

    @abstractmethod
    async def stream_response(self, prompt: str, context: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """SSE 流式推流响应生成"""
        pass
