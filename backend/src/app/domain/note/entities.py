"""笔记与知识库领域实体与值对象模块"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional
from app.domain.base import BaseEntity
from app.utils.snow import id_worker


class SynthesizedNoteType(str, Enum):
    """沉淀笔记类型"""
    GENERAL = "GENERAL"


class SourceType(str, Enum):
    """素材来源类型"""
    BOOK_BLOCK = "BOOK_BLOCK"
    NOTE_CARD = "NOTE_CARD"
    DISCUSS_MSG = "DISCUSS_MSG"
    USER_THOUGHT = "USER_THOUGHT"
    EXPERIENCE = "EXPERIENCE"


class BlockType(str, Enum):
    """自由文档块类型"""
    PARAGRAPH = "PARAGRAPH"
    HEADING = "HEADING"
    MATERIAL_REF = "MATERIAL_REF"
    TASK_REF = "TASK_REF"
    CODE = "CODE"
    QUOTE = "QUOTE"


@dataclass(frozen=True)
class SourceAnchor:
    """SourceAnchor 物理原文锚点值对象"""
    book_id: str
    chapter_id: str
    start_offset: int
    end_offset: int
    feature_text: str  # 20 字符首尾容错特征文本


@dataclass
class MaterialNote(BaseEntity):
    """MaterialNote 素材卡片聚合根"""
    id: str = field(default_factory=lambda: f"mat_{id_worker.next_id_str()}")
    project_id: str = ""
    task_id: str = ""
    source_type: SourceType = SourceType.USER_THOUGHT
    raw_quote: Optional[str] = None           # 素材/原文参考片段
    user_interpretation: str = ""             # 个人转述
    context_reflection: Optional[str] = None  # 关联自身经历/情景
    source_anchor: Optional[SourceAnchor] = None
    tags: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class DocumentBlock:
    """DocumentBlock 自由内容块值对象"""
    block_id: str                              # 块唯一 ID
    block_type: BlockType                      # 块类型
    content: str                               # 文本内容或 Markdown
    material_note_id: Optional[str] = None     # 关联素材笔记 ID (若为 MATERIAL_REF)
    quote_snapshot: Optional[str] = None       # 素材原文快照
    interpretation_snapshot: Optional[str] = None # 素材转述快照


@dataclass
class SynthesizedNote(BaseEntity):
    """SynthesizedNote 沉淀笔记/经验笔记聚合根"""
    id: str = field(default_factory=lambda: f"syn_{id_worker.next_id_str()}")
    project_id: str = ""
    knowledge_base_id: Optional[str] = None
    title: str = ""
    note_type: SynthesizedNoteType = SynthesizedNoteType.GENERAL
    file_path: str = ""                        # 物理相对路径 (形如 data/notes/syn_{uuid}.md)
    summary: Optional[str] = None
    blocks: List[DocumentBlock] = field(default_factory=list)

    def get_referenced_material_ids(self) -> set[str]:
        """获取所有引用的素材卡片 ID 集合"""
        referenced_ids = set()
        for block in self.blocks:
            if block.block_type == BlockType.MATERIAL_REF and block.material_note_id:
                referenced_ids.add(block.material_note_id)
        return referenced_ids


@dataclass
class KnowledgeBase(BaseEntity):
    """KnowledgeBase 知识资产库容器"""
    title: str = ""
    description: str = ""
    notes: List[SynthesizedNote] = field(default_factory=list)
