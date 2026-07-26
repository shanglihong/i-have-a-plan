"""领域事件基类模块"""

from dataclasses import dataclass, field
from datetime import datetime
import uuid


@dataclass
class DomainEvent:
    """领域事件抽象基类"""
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_on: datetime = field(default_factory=datetime.now)
