"""滑动窗口裁剪策略"""

from typing import List
from langchain_core.messages import BaseMessage, SystemMessage
from app.infrastructure.llm.strategies.base import ContextCompressStrategy


class SlidingWindowCompressStrategy(ContextCompressStrategy):
    """滑动窗口裁剪策略 (保留最近 N 轮非 System 消息)"""

    def __init__(self, keep_turns: int = 10):
        # 1 轮包含 1 条用户消息 and 1 条 AI 答复消息，所以消息条数 = 轮数 * 2
        self.keep_count = keep_turns * 2

    def compress(self, messages: List[BaseMessage]) -> List[BaseMessage]:
        # 提取 system 消息（置顶）与非 system 消息
        system_msgs = [m for m in messages if isinstance(m, SystemMessage)]
        other_msgs = [m for m in messages if not isinstance(m, SystemMessage)]

        # 只保留最新的 keep_count 条非 system 消息
        trimmed_msgs = other_msgs[-self.keep_count:]
        return system_msgs + trimmed_msgs
