"""书籍与物理锚点领域事件模块"""

from dataclasses import dataclass
from app.domain.common.events import DomainEvent


@dataclass
class BookParsed(DomainEvent):
    """书籍解析与切片落盘完成领域事件"""
    book_id: str = ""
    parsed_json_path: str = ""
