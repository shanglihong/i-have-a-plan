"""旁路图谱与 RAG 领域事件模块"""

from dataclasses import dataclass, field
from typing import List, Optional
from app.domain.events import DomainEvent


@dataclass
class GraphNodeFalsifiedEvent(DomainEvent):
    """图谱节点被 FALSIFIE 边证伪事件"""
    node_id: str = ""
    reason_edge_id: str = ""


@dataclass
class GraphOrphanNodePrunedEvent(DomainEvent):
    """孤儿节点修剪删除事件"""
    node_id: str = ""
    node_name: str = ""


@dataclass
class GraphUpdated(DomainEvent):
    """图谱闲时建图与代谢更新完成兼容事件"""
    new_node_count: int = 0
    new_edge_count: int = 0
