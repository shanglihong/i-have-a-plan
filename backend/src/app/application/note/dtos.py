"""笔记领域应用层 DTO 与 VO 模型"""

from pydantic import BaseModel, Field
from typing import List, Optional, Any


class SourceAnchorDTO(BaseModel):
    """SourceAnchor 属性校验对象"""
    book_id: str
    chapter_id: str
    start_offset: int
    end_offset: int
    feature_text: str


class DocumentBlockDTO(BaseModel):
    """DocumentBlock 属性校验对象"""
    block_id: Optional[str] = None
    block_type: str
    content: str = ""
    material_note_id: Optional[str] = None
    quote_snapshot: Optional[str] = None
    interpretation_snapshot: Optional[str] = None


class CreateMaterialNoteDTO(BaseModel):
    """创建素材笔记接收参数"""
    project_id: str
    task_id: str
    source_type: str = "BOOK_BLOCK"
    raw_quote: Optional[str] = None
    user_interpretation: str
    context_reflection: Optional[str] = None
    source_anchor: Optional[SourceAnchorDTO] = None
    tags: List[str] = Field(default_factory=list)


class UpdateMaterialNoteDTO(BaseModel):
    """更新素材笔记接收参数"""
    user_interpretation: Optional[str] = None
    context_reflection: Optional[str] = None


class MaterialNoteVO(BaseModel):
    """素材笔记返回视图对象"""
    id: str
    project_id: str
    task_id: str
    source_type: str
    raw_quote: Optional[str] = None
    user_interpretation: str
    context_reflection: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    created_at: str
    # 额外补充，方便前端页面渲染，可由应用层按需查询出对应 block 的 summary
    anchor_summary: Optional[str] = None
    source_anchor: Optional[SourceAnchorDTO] = None


class MaterialNotePageVO(BaseModel):
    """素材笔记游标分页返回视图对象"""
    items: List[MaterialNoteVO]
    next_cursor: Optional[str] = None
    has_next: bool


class CreateSynthesizedNoteDTO(BaseModel):
    """创建沉淀笔记接收参数"""
    project_id: str
    title: str
    note_type: str = "GENERAL"  # GENERAL / EXPERIENCE
    blocks: List[DocumentBlockDTO]
    knowledge_base_id: Optional[str] = None


class UpdateSynthesizedNoteDTO(BaseModel):
    """更新沉淀笔记接收参数"""
    title: str
    blocks: List[DocumentBlockDTO]


class SynthesizedNoteVO(BaseModel):
    """沉淀笔记简版响应对象"""
    id: str
    project_id: str
    title: str
    note_type: str
    file_path: str
    referenced_material_count: int
    created_at: str


class SynthesizedNoteDetailVO(BaseModel):
    """沉淀笔记详情响应对象"""
    id: str
    project_id: str
    knowledge_base_id: Optional[str] = None
    title: str
    note_type: str
    file_path: str
    blocks: List[DocumentBlockDTO]
    created_at: str
    updated_at: str


class DeleteResponseVO(BaseModel):
    """删除操作响应"""
    id: str
    deleted: bool
