"""应用层 DTO 定义 (Book Domain)"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from app.domain.book.entities import Book, BookFileType


class BookResponseDTO(BaseModel):
    id: str
    project_id: str
    file_name: str
    file_type: str
    file_size: int
    parsing_status: str
    total_chapters: int
    total_word_count: int
    storage_path: str
    content_json_path: str
    created_at: str
    updated_at: str

    @classmethod
    def from_domain(cls, entity: Book) -> "BookResponseDTO":
        created_str = entity.created_at.isoformat() if entity.created_at else ""
        updated_str = entity.updated_at.isoformat() if entity.updated_at else ""
        return cls(
            id=entity.id,
            project_id=entity.project_id,
            file_name=entity.file_name,
            file_type=entity.file_type.value if hasattr(entity.file_type, "value") else str(entity.file_type),
            file_size=entity.file_size,
            parsing_status=entity.parsing_status.value if hasattr(entity.parsing_status, "value") else str(entity.parsing_status),
            total_chapters=entity.total_chapters,
            total_word_count=entity.total_word_count,
            storage_path=entity.storage_path,
            content_json_path=entity.content_json_path,
            created_at=created_str,
            updated_at=updated_str
        )


class ContentBlockDTO(BaseModel):
    block_id: str
    block_type: str
    sequence_index: int
    text: str
    html_or_markdown: Optional[str] = None
    page_number: Optional[int] = None
    bbox: Optional[List[float]] = None


class ChapterContentResponseDTO(BaseModel):
    book_id: str
    chapter_id: str
    chapter_index: int
    total_blocks: int
    has_more: bool
    prev_chapter_id: Optional[str] = None
    next_chapter_id: Optional[str] = None
    blocks: List[ContentBlockDTO]


class TocResponseDTO(BaseModel):
    book_id: str
    toc_tree: List[Dict[str, Any]]


class CreateBookRequestDTO(BaseModel):
    project_id: str = Field(..., description="关联的项目 ID")
    file_name: str = Field(..., description="物理文件名")
    file_type: BookFileType = Field(..., description="文件格式类型 (PDF, EPUB, TXT, MD)")
    file_size: Optional[int] = Field(default=0, description="文件字节大小")
    storage_path: Optional[str] = Field(default="", description="物理存储/沙箱相对路径")

    @field_validator("file_type", mode="before")
    @classmethod
    def normalize_file_type(cls, v: Any) -> Any:
        if isinstance(v, str):
            v_upper = v.strip().upper()
            if v_upper in BookFileType.__members__:
                return BookFileType[v_upper]
            return v_upper
        return v

    @field_validator("storage_path")
    @classmethod
    def validate_storage_path(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return ""
        v = v.strip()
        if ".." in v:
            raise ValueError("storage_path 包含了非法的相对路径跳转字符 ('..')")
        return v



