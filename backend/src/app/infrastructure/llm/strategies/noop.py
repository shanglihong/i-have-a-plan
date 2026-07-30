"""不做任何压缩的策略"""

from typing import List
from langchain_core.messages import BaseMessage
from app.infrastructure.llm.strategies.base import ContextCompressStrategy


class NoOpCompressStrategy(ContextCompressStrategy):
    """不做任何压缩的策略"""

    def compress(self, messages: List[BaseMessage]) -> List[BaseMessage]:
        return messages
