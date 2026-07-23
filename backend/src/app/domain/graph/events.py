"""旁路图谱与 RAG 领域事件模块"""

from dataclasses import dataclass
from app.domain.common.events import DomainEvent


@dataclass
class GraphUpdated(DomainEvent):
    """图谱闲时建图与代谢更新完成事件"""
    new_node_count: int = 0
    new_edge_count: int = 0
