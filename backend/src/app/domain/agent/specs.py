"""Agent 规范策略兼容入口"""

from app.domain.agent.service.spec import (
    AgentSpecification,
    ReadingCompanionAgentSpec,
    TaskBreakdownAgentSpec,
    AgentSpecificationRegistry,
)

__all__ = [
    "AgentSpecification",
    "ReadingCompanionAgentSpec",
    "TaskBreakdownAgentSpec",
    "AgentSpecificationRegistry",
]
