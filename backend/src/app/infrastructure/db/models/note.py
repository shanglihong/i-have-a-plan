"""MaterialNote 与 SynthesizedNote 的 SQLModel 持久化模型"""

from datetime import datetime, timezone
from typing import Optional, Any
from sqlmodel import SQLModel, Field, Column, JSON


class MaterialNoteDO(SQLModel, table=True):
    """material_notes 表实体模型"""
    __tablename__ = "material_notes"

    id: str = Field(default="", primary_key=True)
    project_id: str = Field(default="", index=True)
    task_id: str = Field(default="", index=True)
    source_type: str = Field(default="USER_THOUGHT")
    raw_quote: Optional[str] = Field(default=None)
    user_interpretation: str = Field(default="")
    context_reflection: Optional[str] = Field(default=None)
    anchor_json: Optional[str] = Field(default=None)  # 序列化后的 SourceAnchor json 字符串
    tags: Any = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SynthesizedNoteDO(SQLModel, table=True):
    """synthesized_notes 表实体模型"""
    __tablename__ = "synthesized_notes"

    id: str = Field(default="", primary_key=True)
    project_id: str = Field(default="", index=True)
    knowledge_base_id: Optional[str] = Field(default=None, index=True)
    title: str = Field(default="")
    note_type: str = Field(default="GENERAL")
    file_path: str = Field(default="")  # 物理 Markdown 相对路径
    summary: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SynthesizedNoteMaterialRefDO(SQLModel, table=True):
    """synthesized_note_material_refs 中间引用映射表模型"""
    __tablename__ = "synthesized_note_material_refs"

    id: str = Field(default="", primary_key=True)
    synthesized_note_id: str = Field(default="", index=True)
    material_note_id: str = Field(default="", index=True)


class KnowledgeBaseDO(SQLModel, table=True):
    """knowledge_bases 表实体模型"""
    __tablename__ = "knowledge_bases"

    id: str = Field(default="", primary_key=True)
    title: str = Field(default="")
    description: str = Field(default="")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
