"""书籍与物理锚点领域实体与值对象模块"""

from dataclasses import dataclass, field
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Dict, Any
from app.domain.base import BaseEntity
from app.domain.book.exceptions import InvalidStateTransitionException
from app.utils.snow import id_worker


class BookFileType(str, Enum):
    """书籍文件格式"""
    PDF = "PDF"
    EPUB = "EPUB"
    TXT = "TXT"
    MD = "MD"


class ParsingStatus(str, Enum):
    """全生命周期解析状态"""
    PENDING = "PENDING" # 初始化
    PARSING = "PARSING" # 解析中
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class HealingStatus(str, Enum):
    """沙箱book文件自愈与校验状态"""
    INTACT = "INTACT" # 良好
    HEALED_REPARSING = "HEALED_REPARSING" # 直接重新修复
    CORRUPTED = "CORRUPTED" # 文件损坏
    NOT_FOUND = "NOT_FOUND" # 文件缺失


class BlockType(str, Enum):
    """段落/文本块类型"""
    HEADING = "HEADING"
    PARAGRAPH = "PARAGRAPH"
    CODE = "CODE"
    QUOTE = "QUOTE"
    IMAGE = "IMAGE"
    TABLE = "TABLE"


class TocNode(BaseModel):
    """目录节点值对象"""
    model_config = ConfigDict(frozen=True)

    id: str = ""
    title: str = ""
    level: int = 1
    target_chapter_id: str = ""
    target_block_id: Optional[str] = None
    target_page: Optional[int] = None
    children: List["TocNode"] = Field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump(mode="json")

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TocNode":
        return cls.model_validate(data)


class ContentBlock(BaseModel):
    """内容块值对象"""
    model_config = ConfigDict(frozen=True)

    block_id: str = ""
    block_type: BlockType = BlockType.PARAGRAPH
    sequence_index: int = 0
    text: str = ""
    html_or_markdown: Optional[str] = None
    page_number: Optional[int] = None
    bbox: Optional[List[float]] = None

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump(mode="json")

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ContentBlock":
        return cls.model_validate(data)


@dataclass
class ChapterContent:
    """章节内容切片及关联上下文结构值对象"""
    book_id: str
    chapter_id: str
    chapter_index: int
    total_blocks: int
    has_more: bool
    prev_chapter_id: Optional[str] = None
    next_chapter_id: Optional[str] = None
    blocks: List[ContentBlock] = field(default_factory=list)




@dataclass
class SourceAnchor(BaseEntity):
    """物理锚点实体"""
    book_id: str = ""
    chapter_id: str = ""
    block_id: str = ""
    char_start_offset: int = 0
    char_end_offset: int = 0
    page_number: Optional[int] = None
    pdf_rects: Optional[List[List[float]]] = None
    epub_cfi: Optional[str] = None
    text_snippet: str = ""
    prefix_context: str = ""
    suffix_context: str = ""
    content_hash: str = ""


@dataclass
class Book(BaseEntity):
    """书籍实体"""
    id: str = field(default_factory=lambda: f"bk_{id_worker.next_id_str()}")
    project_id: str = ""
    file_name: str = ""
    file_type: BookFileType = BookFileType.TXT
    file_size: int = 0
    storage_path: str = ""
    content_json_path: str = ""
    parsing_status: ParsingStatus = ParsingStatus.PENDING
    parsed_structure: List[Dict[str, Any]] = field(default_factory=list)
    total_chapters: int = 0
    total_word_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @property
    def toc_tree(self) -> List[TocNode]:
        """获取强类型的 TocNode 目录大纲节点列表"""
        return [TocNode.from_dict(item) for item in self.parsed_structure]

    def is_completed(self) -> bool:
        return self.parsing_status == ParsingStatus.COMPLETED

    def is_parsing(self) -> bool:
        return self.parsing_status == ParsingStatus.PARSING

    def is_failed(self) -> bool:
        return self.parsing_status == ParsingStatus.FAILED

    def start_parsing(self) -> None:
        """启动解析"""
        current = self.parsing_status
        if current not in [ParsingStatus.PENDING, ParsingStatus.FAILED, ParsingStatus.PARSING]:
            raise InvalidStateTransitionException(current.value, ParsingStatus.PARSING.value)

        self.parsing_status = ParsingStatus.PARSING
        self.updated_at = datetime.now(timezone.utc)

    def complete_parsing(
        self,
        toc_tree: List[TocNode],
        total_chapters: int,
        total_word_count: int,
        content_json_path: str
    ) -> None:
        """完成解析"""
        current = self.parsing_status
        if current not in [ParsingStatus.PARSING, ParsingStatus.PENDING]:
            raise InvalidStateTransitionException(current, ParsingStatus.COMPLETED.value)

        self.parsed_structure = [node.model_dump(mode="json") for node in toc_tree]
        self.total_chapters = total_chapters
        self.total_word_count = total_word_count
        self.content_json_path = content_json_path
        self.parsing_status = ParsingStatus.COMPLETED
        self.updated_at = datetime.now(timezone.utc)

    def fail_parsing(self) -> None:
        """标记解析失败"""
        self.parsing_status = ParsingStatus.FAILED
        self.updated_at = datetime.now(timezone.utc)
