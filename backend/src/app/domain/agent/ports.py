"""统一 Agent 领域 Ports 端口抽象模块"""

from langchain_core.messages import BaseMessage
from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, AsyncIterator, Dict, List, Optional
from app.domain.agent.entities import AgentSession
from app.domain.agent.stream_events import StreamEvent


class AgentRepositoryPort(ABC):
    """Agent 领域持久化 Repository 端口"""

    @abstractmethod
    async def get_active_session(self, project_id: str) -> Optional[AgentSession]:
        """获取项目激活的 Agent 会话"""
        pass

    @abstractmethod
    async def save_session(self, session: AgentSession) -> None:
        """保存 Agent 会话实体"""
        pass

    @abstractmethod
    async def find_session_by_id(self, session_id: str) -> Optional[AgentSession]:
        """通过 ID 查找 Agent 会话"""
        pass


class LLMServicePort(ABC):
    """大模型调用服务端口 (Outbound Port)"""

    @abstractmethod
    def stream_chat(
        self,
        session_id: str,
        prompt: str,
        system_instruction: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tools: Optional[List] = None,
    ) -> AsyncGenerator[StreamEvent, None]:
        """流式大模型生成接口，内部支持持久化与上下文管理

        Args:
            tools: 当前调用场景的工具列表，为空则退化为纯对话模式。
        Yields:
            StreamEvent 实例，可用 .type 区分事件种类，.data 取负载数据。
        """
        pass

    @abstractmethod
    async def get_messages(self, session_id: str) -> List[BaseMessage]:
        """获取指定会话的历史消息列表"""
        pass

    @abstractmethod
    async def get_message_by_id(self, session_id: str, message_id: str) -> Optional[BaseMessage]:
        """获取会话中指定 ID 的消息"""
        pass

    @abstractmethod
    async def update_message_kwargs(self, session_id: str, message_id: str, additional_kwargs: dict) -> None:
        """更新指定消息的 additional_kwargs"""
        pass
