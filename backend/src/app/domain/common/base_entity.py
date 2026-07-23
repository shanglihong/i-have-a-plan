"""公共领域基类模块

包含领域实体基类、通用值对象及领域事件基类。
"""

from dataclasses import dataclass, field
from datetime import datetime
import uuid


@dataclass
class BaseEntity:
    """所有领域实体的抽象基类"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
