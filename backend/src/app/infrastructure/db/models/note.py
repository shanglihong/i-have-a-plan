"""MaterialNote 与 TaskNoteAttachment 的 SQLModel 持久化模型"""

from datetime import datetime, timezone
from typing import Optional, Any
from sqlmodel import SQLModel, Field, Column, JSON


class MaterialNoteDO(SQLModel, table=True):
    """material_notes 表实体模型"""
    __tablename__ = "material_notes"

    id: str = Field(default="", primary_key=True)
    anchor_id: Optional[str] = Field(default=None)
    task_id: Optional[str] = Field(default=None, index=True)
    content: str = Field(default="")
    tags: Any = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
