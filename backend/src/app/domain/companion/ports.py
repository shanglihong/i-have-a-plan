"""AI 伴读领域 Ports 端口抽象模块"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, List, Optional
from app.domain.companion.entities import CompanionSession, DiscussMessage


class CompanionRepositoryPort(ABC):
    """Companion 领域持久化 Repository 端口"""

    @abstractmethod
    async def get_active_session(self, project_id: str) -> Optional[CompanionSession]:
        """获取项目激活的伴读会话"""
        pass

    @abstractmethod
    async def save_session(self, session: CompanionSession) -> None:
        """保存伴读会话实体"""
        pass

    @abstractmethod
    async def save_message(self, message: DiscussMessage) -> None:
        """保存伴读消息实体"""
        pass

    @abstractmethod
    async def list_messages(
        self, session_id: str, page: int = 1, page_size: int = 20
    ) -> tuple[List[DiscussMessage], int]:
        """获取伴读会话历史消息列表"""
        pass

    @abstractmethod
    async def find_message_by_id(self, message_id: str) -> Optional[DiscussMessage]:
        """通过 ID 查找伴读消息"""
        pass


class SandboxRunnerPort(ABC):
    """受限物理沙箱 Agent 运行端口 (PA-05)"""

    @abstractmethod
    async def ensure_runner_started(self, agent_id: str) -> str:
        """保证沙箱 Runner 懒加载启动，返回 runner 句柄"""
        pass

    @abstractmethod
    async def execute_stream(
        self, runner_handle: str, formatted_prompt: str
    ) -> AsyncGenerator[Dict[str, str], None]:
        """通过 Pipe 管道向沙箱发送 Prompt，并异步生成流式 Token 及 Action Cards Chunk"""
        pass
