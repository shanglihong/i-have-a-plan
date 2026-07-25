"""领域防腐接口 (Domain Ports) 基类模块"""

from abc import ABC, abstractmethod
from typing import Any


class DomainPort(ABC):
    """所有领域端口防腐接口基类"""
    pass


class EventPublisherPort(ABC):
    """通用领域事件发布代理接口"""

    @abstractmethod
    async def publish(self, event: Any) -> None:
        """发布领域事件"""
        ...
