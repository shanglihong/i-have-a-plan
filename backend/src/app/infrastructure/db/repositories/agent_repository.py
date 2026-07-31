"""内存态 Agent 仓储适配器实现"""

from typing import Dict, Optional
from app.domain.agent import AgentSession, AgentRepositoryPort


class InMemoryAgentRepositoryAdapter(AgentRepositoryPort):
    """基于内存的 Agent 仓储适配器，无需数据库建模迁移，适用于轻量级内存会话管理"""

    def __init__(self):
        self._sessions: Dict[str, AgentSession] = {}

    async def get_active_session(self, project_id: str) -> Optional[AgentSession]:
        for session in self._sessions.values():
            if session.project_id == project_id and session.status != "TERMINATED":
                return session
        return None

    async def save_session(self, session: AgentSession) -> None:
        self._sessions[session.id] = session

    async def find_session_by_id(self, session_id: str) -> Optional[AgentSession]:
        return self._sessions.get(session_id)

    async def find_session_by_agent_id(self, agent_id: str) -> Optional[AgentSession]:
        for session in self._sessions.values():
            if session.agent_id == agent_id and session.status != "TERMINATED":
                return session
        return None

