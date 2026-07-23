"""书籍与物理锚点领域实体模块"""

from dataclasses import dataclass, field
from typing import List, Optional
from app.domain.common.base_entity import BaseEntity


@dataclass
class TocNode:
    """大纲树节点"""
    id: str = ""
    title: str = ""
    level: int = 1
    children: List["TocNode"] = field(default_factory=list)


@dataclass
class SourceAnchor(BaseEntity):
    """SourceAnchor 物理锚点 (支持 DOM/CFI/段落 hash 三层定位解算)"""
    book_id: str = ""
    cfi: Optional[str] = None
    paragraph_hash: Optional[str] = None
    selected_text: str = ""


@dataclass
class Book(BaseEntity):
    """Book 实体"""
    title: str = ""
    author: str = ""
    file_path: str = ""
    parsed_json_path: str = ""
    toc: List[TocNode] = field(default_factory=list)
