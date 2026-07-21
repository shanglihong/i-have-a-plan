"""
知识图谱上下文 - 核心实体定义

图谱遵循"知识代谢"机制：
  - GraphNode：图谱节点，可被经验笔记"证伪降级"（is_falsified=True）
  - GraphEdge：认知关系边，支持 ASSOCIATES（关联）和 FALSIFIES（证伪）两种类型
  - TagSuperNode：标签超节点，作为图谱聚类中心
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class EdgeRelationType(str, Enum):
    ASSOCIATES = "ASSOCIATES"
    FALSIFIES = "FALSIFIES"


class GraphNode(SQLModel, table=True):
    """图谱节点 DO - 聚合根"""

    __tablename__ = "graph_node"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    name: str = Field(index=True)
    source_note_id: Optional[str] = Field(default=None, index=True)
    # 是否被经验证伪降级（前端降低透明度至 40%）
    is_falsified: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GraphEdge(SQLModel, table=True):
    """图谱连线关系 DO"""

    __tablename__ = "graph_edge"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    source_id: str = Field(foreign_key="graph_node.id", index=True)
    target_id: str = Field(foreign_key="graph_node.id", index=True)
    relation_type: EdgeRelationType = Field(default=EdgeRelationType.ASSOCIATES)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TagSuperNode(SQLModel, table=True):
    """标签超节点 DO（图谱聚类对齐中心）"""

    __tablename__ = "tag_super_node"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    name: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Domain Objects (内存充血模型)
# ---------------------------------------------------------------------------


class GraphNodeDomain:
    """图谱节点充血模型 - 装载邻居节点（邻接表）"""

    def __init__(self, do: GraphNode) -> None:
        self.do = do
        self.related_nodes: list[GraphNodeDomain] = []

    @property
    def id(self) -> str:
        return self.do.id
