"""旁路图谱与 RAG 领域实体模块"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional
from app.domain.common.base_entity import BaseEntity


class EdgeRelationType(str, Enum):
    """图谱边关联类型"""
    ASSOCIATES = "ASSOCIATES"
    FALSIFIES = "FALSIFIES"  # 证明 / 证伪代谢边


@dataclass
class VectorChunkIndex(BaseEntity):
    """VectorChunkIndex sqlite-vec 向量索引定义"""
    content: str = ""
    embedding: List[float] = field(default_factory=list)
    source_file: str = ""
    chunk_offset: int = 0


@dataclass
class TagSuperNode(BaseEntity):
    """TagSuperNode 标签超节点"""
    tag_name: str = ""


@dataclass
class GraphNode(BaseEntity):
    """GraphNode 知识原子节点"""
    label: str = ""
    properties: dict = field(default_factory=dict)
    super_node_id: Optional[str] = None


@dataclass
class GraphEdge(BaseEntity):
    """GraphEdge 认知边"""
    source_node_id: str = ""
    target_node_id: str = ""
    relation_type: EdgeRelationType = EdgeRelationType.ASSOCIATES
    weight: float = 1.0
