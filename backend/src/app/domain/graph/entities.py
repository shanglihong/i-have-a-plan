"""旁路图谱与 RAG 领域实体模块"""

from app.domain.base import BaseEntity
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional

DEFAULT_NODE_WEIGHT: float = 1.0
DEFAULT_EDGE_WEIGHT: float = 1.0
WEIGHT_DELTA_ON_MERGE: float = 0.5
DECAY_WEIGHT_THRESHOLD: float = 0.4

from app.utils.snow import id_worker


class PendingStatusEnum(str, Enum):
    """图谱待处理任务状态"""
    PENDING = "PENDING"          # 待处理
    PROCESSING = "PROCESSING"    # 处理中
    COMPLETED = "COMPLETED"      # 已完成
    FAILED = "FAILED"            # 失败重试/死信


class GraphNodeEntityTypeEnum(str, Enum):
    """知识原子节点类型"""
    CONCEPT = "CONCEPT"          # 概念
    METHODOLOGY = "METHODOLOGY"  # 方法论
    TOOL = "TOOL"                # 工具

    @classmethod
    def from_str(cls, value: str) -> "GraphNodeEntityTypeEnum":
        """从字符串解析节点实体类型枚举，非法值容错为 CONCEPT"""
        if value in cls.__members__:
            return cls[value]
        try:
            return cls(value)
        except ValueError:
            return cls.CONCEPT


class GraphNodeStatusEnum(str, Enum):
    """图谱节点状态"""
    ACTIVE = "ACTIVE"            # 活跃
    FALSIFIED = "FALSIFIED"      # 被证伪/反驳
    DECAYED = "DECAYED"          # 衰变


class GraphRelationTypeEnum(str, Enum):
    """认知关系边类型"""
    ASSOCIATES = "ASSOCIATES"    # 关联边
    FALSIFIE = "FALSIFIE"        # 证伪/反驳边

    @classmethod
    def from_str(cls, value: str) -> "GraphRelationTypeEnum":
        """从字符串解析认知关系类型枚举，容错回退为 ASSOCIATES"""
        if value in cls.__members__:
            return cls[value]
        try:
            return cls(value)
        except ValueError:
            return cls.ASSOCIATES


class SourceTypeEnum(str, Enum):
    """切片物料来源类型"""
    BOOK_BLOCK = "BOOK_BLOCK"    # 图书段落切片
    NOTE_CARD = "NOTE_CARD"      # 笔记卡片切片


# ----------------------------------------------------------------------
# Domain Entities / Aggregates & Models
# ----------------------------------------------------------------------

@dataclass
class GraphPendingBlock(BaseEntity):
    """图谱待处理任务实体"""
    id: str = field(default_factory=lambda: f"gpb_{id_worker.next_id_str()}")
    block_id: str = ""
    source_type: SourceTypeEnum = SourceTypeEnum.NOTE_CARD
    project_id: str = ""
    status: PendingStatusEnum = PendingStatusEnum.PENDING
    retry_count: int = 0

    def mark_processing(self) -> None:
        self.status = PendingStatusEnum.PROCESSING
        self.updated_at = datetime.now()

    def mark_completed(self) -> None:
        self.status = PendingStatusEnum.COMPLETED
        self.updated_at = datetime.now()

    def mark_failed(self, increment_retry: bool = True) -> None:
        if increment_retry:
            self.retry_count += 1
        self.status = PendingStatusEnum.FAILED
        self.updated_at = datetime.now()

    def reset_to_pending(self) -> None:
        self.status = PendingStatusEnum.PENDING
        self.updated_at = datetime.now()


@dataclass
class VectorChunkIndex(BaseEntity):
    """向量索引实体"""
    id: str = field(default_factory=lambda: f"vec_{id_worker.next_id_str()}")
    source_type: SourceTypeEnum = SourceTypeEnum.NOTE_CARD
    source_id: str = ""
    block_id: str = ""
    embedding: List[float] = field(default_factory=list)
    text_hash: str = ""


@dataclass
class GraphNode(BaseEntity):
    """知识原子节点聚合根"""
    id: str = field(default_factory=lambda: f"gn_{id_worker.next_id_str()}")
    name: str = ""
    entity_type: GraphNodeEntityTypeEnum = GraphNodeEntityTypeEnum.CONCEPT
    source_id: str = ""
    project_ids: List[str] = field(default_factory=list)
    block_ids: List[str] = field(default_factory=list)
    weight: float = DEFAULT_NODE_WEIGHT
    status: GraphNodeStatusEnum = GraphNodeStatusEnum.ACTIVE

    @classmethod
    def from_extracted(
        cls,
        ext_entity: "ExtractedEntity",
        block_id: str,
        project_id: str,
    ) -> "GraphNode":
        """从 LLM 抽取实体创建 GraphNode"""
        return cls(
            name=ext_entity.name,
            entity_type=GraphNodeEntityTypeEnum.from_str(ext_entity.entity_type),
            source_id=block_id,
            project_ids=[project_id] if project_id else [],
            block_ids=[block_id] if block_id else [],
        )

    def merge(self, other: "GraphNode") -> None:
        """节点合并"""
        if not self.source_id and other.source_id:
            self.source_id = other.source_id
        for b_id in other.block_ids:
            if b_id and b_id not in self.block_ids:
                self.block_ids.append(b_id)
        for p_id in other.project_ids:
            if p_id and p_id not in self.project_ids:
                self.project_ids.append(p_id)
        self.weight = round(self.weight + other.weight, 2)
        self.updated_at = datetime.now()

    def remove_block_binding(self, block_id: str, weight_delta: float = 0.2) -> bool:
        """解绑切片 ID 并扣减权重，返回是否孤儿节点"""
        if block_id in self.block_ids:
            self.block_ids.remove(block_id)
        self.weight = max(0.0, round(self.weight - weight_delta, 2))
        self.updated_at = datetime.now()
        return len(self.block_ids) == 0

    def falsify(self) -> None:
        """标记节点为证伪状态"""
        self.status = GraphNodeStatusEnum.FALSIFIED
        self.weight = min(self.weight, 0.3)
        self.updated_at = datetime.now()

    def decay(self, delta: float = 0.2) -> None:
        """代谢衰变"""
        self.weight = max(0.0, round(self.weight - delta, 2))
        if self.weight < DECAY_WEIGHT_THRESHOLD and self.status == GraphNodeStatusEnum.ACTIVE:
            self.status = GraphNodeStatusEnum.DECAYED
        self.updated_at = datetime.now()


@dataclass
class GraphEdge(BaseEntity):
    """认知关系边实体"""
    id: str = field(default_factory=lambda: f"ge_{id_worker.next_id_str()}")
    source_node_id: str = ""
    target_node_id: str = ""
    relation_type: GraphRelationTypeEnum = GraphRelationTypeEnum.ASSOCIATES
    weight: float = DEFAULT_EDGE_WEIGHT

    @classmethod
    def from_extracted(
        cls,
        ext_rel: "ExtractedRelation",
        source_node_id: str,
        target_node_id: str,
    ) -> "GraphEdge":
        """从 LLM 抽取关系创建 GraphEdge"""
        return cls(
            source_node_id=source_node_id,
            target_node_id=target_node_id,
            relation_type=GraphRelationTypeEnum.from_str(ext_rel.relation_type),
            weight=ext_rel.weight,
        )


@dataclass
class TagSuperNode(BaseEntity):
    """全局标签超节点实体"""
    id: str = field(default_factory=lambda: f"tsn_{id_worker.next_id_str()}")
    name: str = ""
    synonym_tags: List[str] = field(default_factory=list)
    node_count: int = 0


@dataclass(frozen=True)
class GlobalGraph:
    """全局/项目图谱模型"""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    tag_super_nodes: List[TagSuperNode]


@dataclass(frozen=True)
class ExtractedEntity:
    """LLM 抽取实体"""
    name: str
    entity_type: str
    summary: str = ""


@dataclass(frozen=True)
class ExtractedRelation:
    """LLM 抽取关系"""
    source_node_name: str
    target_node_name: str
    relation_type: str
    weight: float = 1.0
