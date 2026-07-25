"""Book 实体在 SQLite 中的持久化模型 (BookDO)"""

from datetime import datetime, timezone
from typing import Optional, Any
from sqlmodel import SQLModel, Field, Column, JSON


class BookDO(SQLModel, table=True):
    """books 表实体模型"""
    __tablename__ = "books"

    id: str = Field(default="", primary_key=True)
    project_id: str = Field(index=True)
    file_name: str
    file_type: str
    file_size: int
    storage_path: str
    content_json_path: str
    parsing_status: str
    parsed_structure: Any = Field(default=[], sa_column=Column(JSON))
    total_chapters: int = Field(default=0)
    total_word_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
