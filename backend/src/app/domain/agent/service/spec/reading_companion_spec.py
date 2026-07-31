"""阅读伴读模式 Agent 规范策略"""

from typing import List
from langchain_core.tools import BaseTool

from app.domain.agent.entities import AgentMode, TriggerType, PromptContext
from app.domain.agent.prompt.factory import PromptFactory
from app.domain.agent.service.spec.base import AgentSpecification
from app.domain.agent.tools import (
    BookQueryPort,
    make_get_book_content_tool,
    make_present_card_tool,
)


class ReadingCompanionAgentSpec(AgentSpecification):
    """阅读伴读 Agent 策略规范"""

    def __init__(self, tool_book_query: BookQueryPort):
        self.common_card_tool = make_present_card_tool()
        self.book_content_tool = make_get_book_content_tool(tool_book_query)

    @property
    def mode(self) -> AgentMode:
        return AgentMode.READING_COMPANION

    def get_tools(self) -> List[BaseTool]:
        return [self.book_content_tool, self.common_card_tool]

    def format_prompt(self, context: PromptContext, trigger_type: TriggerType) -> str:
        return PromptFactory.create_prompt(
            mode=self.mode,
            trigger_type=trigger_type,
            context=context,
        )

