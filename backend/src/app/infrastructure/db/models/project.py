"""Project, TaskChain 与 Task 在 SQLite 中的持久化模型 (ProjectDO, TaskChainDO, TaskDO)"""

from datetime import datetime, timezone
from typing import Optional, Any, List
from sqlmodel import SQLModel, Field, Column, JSON


class ProjectDO(SQLModel, table=True):
    """projects 表实体模型"""
    __tablename__ = "projects"

    id: str = Field(default="", primary_key=True)
    title: str = Field(index=True)
    description: str = Field(default="")
    project_type: str = Field(index=True)
    status: str = Field(index=True)
    assigned_agent_id: Optional[str] = Field(default=None)
    deadline: Optional[datetime] = Field(default=None)
    book_id: Optional[str] = Field(default=None)
    tags: Any = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskChainDO(SQLModel, table=True):
    """task_chains 表实体模型"""
    __tablename__ = "task_chains"

    id: str = Field(default="", primary_key=True)
    project_id: str = Field(index=True)
    title: str = Field(default="")
    chain_type: str = Field(default="DEFAULT")
    sequence_order: int = Field(default=1)
    status: str = Field(default="PENDING")
    book_id: Optional[str] = Field(default=None)
    chapter_id: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskDO(SQLModel, table=True):
    """tasks 表实体模型"""
    __tablename__ = "tasks"

    id: str = Field(default="", primary_key=True)
    task_chain_id: str = Field(index=True)
    title: str = Field(default="")
    description: str = Field(default="")
    sequence_order: int = Field(default=1)
    status: str = Field(default="PENDING")
    parent_task_id: Optional[str] = Field(default=None)
    depends_on_task_ids: Any = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NoteAttachmentDO(SQLModel, table=True):
    """task_note_attachments 关联表实体模型"""
    __tablename__ = "task_note_attachments"

    id: str = Field(default="", primary_key=True)
    task_id: str = Field(index=True)
    material_note_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
