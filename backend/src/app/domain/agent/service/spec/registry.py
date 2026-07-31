"""Agent 规范策略注册表/工厂模块"""

from typing import Dict
from app.domain.agent.entities import AgentMode
from app.domain.agent.service.spec.base import AgentSpecification
from app.domain.agent.service.spec.reading_companion_spec import ReadingCompanionAgentSpec
from app.domain.agent.service.spec.task_breakdown_spec import TaskBreakdownAgentSpec
from app.domain.agent.tools import BookQueryPort, ProjectTaskPort


class AgentSpecificationRegistry:
    """Agent 策略注册表/工厂"""

    def __init__(
        self,
        tool_book_query: BookQueryPort,
        tool_project_task_port: ProjectTaskPort,
    ):
        self._specs: Dict[AgentMode, AgentSpecification] = {
            AgentMode.READING_COMPANION: ReadingCompanionAgentSpec(tool_book_query),
            AgentMode.TASK_BREAKDOWN: TaskBreakdownAgentSpec(tool_project_task_port),
        }

    def get_spec(self, mode: AgentMode) -> AgentSpecification:
        spec = self._specs.get(mode)
        if not spec:
            raise ValueError(f"未找到模式 {mode} 的 Agent 规范策略")
        return spec
