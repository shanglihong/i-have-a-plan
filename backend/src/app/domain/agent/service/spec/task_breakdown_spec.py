"""任务拆解模式 Agent 规范策略"""

from typing import List
from langchain_core.tools import BaseTool

from app.domain.agent.entities import AgentMode, TriggerType, PromptContext
from app.domain.agent.prompt.factory import PromptFactory
from app.domain.agent.service.spec.base import AgentSpecification
from app.domain.agent.tools import (
    ProjectTaskPort,
    make_attach_task_tree_tool,
    make_present_card_tool,
)


class TaskBreakdownAgentSpec(AgentSpecification):
    """任务拆解 Agent 策略规范"""

    def __init__(self, tool_project_task_port: ProjectTaskPort):
        self.common_card_tool = make_present_card_tool()
        self.attach_task_tree_tool = make_attach_task_tree_tool(tool_project_task_port)

    @property
    def mode(self) -> AgentMode:
        return AgentMode.TASK_BREAKDOWN

    def get_tools(self) -> List[BaseTool]:
        return [self.attach_task_tree_tool, self.common_card_tool]

    def format_prompt(self, context: PromptContext, trigger_type: TriggerType) -> str:
        return PromptFactory.create_prompt(
            mode=self.mode,
            trigger_type=trigger_type,
            context=context,
        )

