"""Agent 会话状态管理与句柄绑定领域服务"""

from typing import Optional
from app.utils.snow import id_worker
from app.domain.events import EventPublisherPort
from app.domain.agent.ports import AgentRepositoryPort
from app.domain.agent.entities import AgentSession, AgentMode, SessionStatus
from app.domain.agent.events import AgentSessionTerminatedEvent
from app.domain.agent.exceptions import AgentSessionNotFoundException


class AgentStateService:
    """Agent 会话状态管理与句柄绑定领域服务"""

    def __init__(
        self,
        repository: AgentRepositoryPort,
        event_publisher: EventPublisherPort,
    ):
        self.repository = repository
        self.event_publisher = event_publisher

    async def create_agent_session(self, project_id: str, mode: AgentMode, skill_id: Optional[str] = None) -> AgentSession:
        existing = await self.repository.get_active_session(project_id)
        if existing:
            return existing.agent_id

        # 新建 Session
        session_id = f"sess_{id_worker.next_id_str()}"
        agent_id = f"agent_{id_worker.next_id_str()}"
        session = AgentSession(
            id=session_id,
            project_id=project_id,
            agent_id=agent_id,
            skill_id=skill_id,
            mode=mode,
            status=SessionStatus.IDLE
        )
        await self.repository.save_session(session)
        return session


    async def terminate_session(self, session_id: str) -> None:
        """异常熔断或项目销毁，终止会话"""
        session = await self.repository.find_session_by_id(session_id)
        if not session:
            raise AgentSessionNotFoundException(f"未找到会话: {session_id}")
        session.terminate()
        await self.repository.save_session(session)
        
        # 发送销毁事件
        await self.event_publisher.publish(
            AgentSessionTerminatedEvent(
                session_id=session.id,
                project_id=session.project_id,
            )
        )
