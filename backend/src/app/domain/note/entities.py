"""笔记与知识库领域实体模块"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional
from app.domain.common.base_entity import BaseEntity


class SynthesizedNoteType(str, Enum):
    """沉淀笔记类型"""
    GENERAL = "GENERAL"
    EXPERIENCE = "EXPERIENCE"


@dataclass
class MaterialNote(BaseEntity):
    """MaterialNote 素材卡片"""
    anchor_id: Optional[str] = None
    task_id: Optional[str] = None
    content: str = ""
    tags: List[str] = field(default_factory=list)


@dataclass
class SynthesizedNote(BaseEntity):
    """SynthesizedNote 沉淀笔记"""
    title: str = ""
    content: str = ""
    note_type: SynthesizedNoteType = SynthesizedNoteType.GENERAL
    source_material_ids: List[str] = field(default_factory=list)


@dataclass
class KnowledgeBase(BaseEntity):
    """KnowledgeBase 知识资产库容器"""
    title: str = ""
    description: str = ""
    synthesized_note_ids: List[str] = field(default_factory=list)
