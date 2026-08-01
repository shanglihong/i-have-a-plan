"""旁路图谱与 RAG 在 SQLite 中的持久化模型 (Graph DOs)"""

from datetime import datetime, timezone
from typing import Optional, Any
from sqlmodel import SQLModel, Field, Column, JSON


class GraphPendingBlockDO(SQLModel, table=True):
    """graph_pending_blocks 表持久化模型"""

    __tablename__ = "graph_pending_blocks"

    id: str = Field(default="", primary_key=True)
    block_id: str = Field(index=True, unique=True)
    source_type: str
    project_id: str = Field(index=True)
    status: str = Field(index=True)
    retry_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GraphNodeDO(SQLModel, table=True):
    """graph_nodes 表持久化模型"""

    __tablename__ = "graph_nodes"

    id: str = Field(default="", primary_key=True)
    name: str = Field(index=True)
    entity_type: str = Field(index=True)
    status: str
    block_ids: Any = Field(default=[], sa_column=Column(JSON))
    weight: float = Field(default=1.0)
    project_ids: Any = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GraphEdgeDO(SQLModel, table=True):
    """graph_edges 表持久化模型"""

    __tablename__ = "graph_edges"

    id: str = Field(default="", primary_key=True)
    source_node_id: str = Field(index=True)
    target_node_id: str = Field(index=True)
    relation_type: str = Field(index=True)
    weight: float = Field(default=1.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TagSuperNodeDO(SQLModel, table=True):
    """tag_super_nodes 表持久化模型"""

    __tablename__ = "tag_super_nodes"

    id: str = Field(default="", primary_key=True)
    name: str = Field(index=True, unique=True)
    synonym_tags: Any = Field(default=[], sa_column=Column(JSON))
    node_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VectorChunkIndexDO(SQLModel, table=True):
    """vector_chunk_indices 表持久化模型"""

    __tablename__ = "vector_chunk_indices"

    id: str = Field(default="", primary_key=True)
    block_id: str = Field(index=True)
    source_type: str = Field(default="NOTE_CARD")
    source_id: str = Field(default="")
    text_hash: str = Field(default="")
    embedding: Any = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
