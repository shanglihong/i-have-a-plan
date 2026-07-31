"""Agent 规范策略包入口"""

from app.domain.agent.service.spec.base import AgentSpecification
from app.domain.agent.service.spec.reading_companion_spec import ReadingCompanionAgentSpec
from app.domain.agent.service.spec.task_breakdown_spec import TaskBreakdownAgentSpec
from app.domain.agent.service.spec.registry import AgentSpecificationRegistry

__all__ = [
    "AgentSpecification",
    "ReadingCompanionAgentSpec",
    "TaskBreakdownAgentSpec",
    "AgentSpecificationRegistry",
]
