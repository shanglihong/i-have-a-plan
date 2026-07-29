"""领域事件基类模块"""
from abc import abstractmethod, ABC
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.utils.snow import id_worker


class EventPublisherPort(ABC):
    """通用领域事件发布代理接口"""

    @abstractmethod
    async def publish(self, event: Any) -> None:
        """发布领域事件"""
        ...

@dataclass
class DomainEvent:
    """领域事件抽象基类"""
    event_id: str = field(default_factory=lambda: id_worker.next_id_str())
    occurred_on: datetime = field(default_factory=datetime.now)