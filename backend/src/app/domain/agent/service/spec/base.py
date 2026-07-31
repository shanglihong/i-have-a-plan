"""Agent 规范策略抽象基类模块"""

from abc import ABC, abstractmethod
from typing import List
from langchain_core.tools import BaseTool
from app.domain.agent.entities import AgentMode, TriggerType
from app.domain.agent.context import BaseAgentContext


class AgentSpecification(ABC):
    """Agent 领域能力规范接口/抽象策略基类"""

    @property
    @abstractmethod
    def mode(self) -> AgentMode:
        """定义的 Agent 模式"""
        pass

    @abstractmethod
    def get_tools(self) -> List[BaseTool]:
        """获取该 Agent 绑定的工具集"""
        pass

    @abstractmethod
    def format_prompt(self, context: BaseAgentContext, trigger_type: TriggerType) -> str:
        """根据上下文与触发类型格式化提示词"""
        pass
