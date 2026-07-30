"""大模型历史消息压缩与裁剪策略基类定义"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import List
from langchain_core.messages import BaseMessage


class CompressStrategyType(str, Enum):
    """上下文压缩裁剪策略类型枚举"""
    SLIDING_WINDOW = "SLIDING_WINDOW"
    NOOP = "NOOP"


class ContextCompressStrategy(ABC):
    """大模型对话上下文压缩与裁剪策略防腐接口"""

    @abstractmethod
    def compress(self, messages: List[BaseMessage]) -> List[BaseMessage]:
        """压缩或裁剪历史消息队列，返回处理后的消息列表"""
        pass
