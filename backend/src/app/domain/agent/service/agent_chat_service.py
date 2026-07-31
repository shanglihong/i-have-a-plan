"""Agent 对话核心流程领域服务"""

from typing import Any, AsyncGenerator, Dict, List, Optional
from app.domain.agent.entities import AgentMode, TriggerType, AgentSession, PromptContext
from app.domain.agent.exceptions import AgentSessionNotFoundException
from app.domain.agent.ports import AgentRepositoryPort, LLMServicePort
from app.domain.agent.service.spec import AgentSpecificationRegistry
from app.domain.agent.stream_events import StreamEvent
from app.domain.agent.tools import BookQueryPort, ProjectTaskPort


class AgentChatDomainService:
    """Agent 对话核心流程领域服务"""

    def __init__(
        self,
        repository: AgentRepositoryPort,
        llm_service: LLMServicePort,
        tool_book_query: BookQueryPort,
        tool_project_task_port: ProjectTaskPort,
    ):
        self.repository = repository
        self.llm_service = llm_service
        self.spec_registry = AgentSpecificationRegistry(
            tool_book_query=tool_book_query,
            tool_project_task_port=tool_project_task_port,
        )

    async def stream_chat(
        self,
        project_id: str,
        mode: AgentMode,
        trigger_type: TriggerType,
        context: PromptContext,
    ) -> AsyncGenerator[StreamEvent, None]:

        """公有流式对话业务入口：获取 Session、Agent 策略组装并驱动底层流"""
        session = await self.repository.get_active_session(project_id)
        if not session:
            raise AgentSessionNotFoundException(f"未找到项目 {project_id} 的活动 Agent 会话")

        spec = self.spec_registry.get_spec(mode)
        prompt = spec.format_prompt(context, trigger_type)
        tools = spec.get_tools()

        async for event in self._execute_stream_chat(
            session=session,
            prompt=prompt,
            tools=tools,
        ):
            yield event

    async def _execute_stream_chat(
        self,
        session: AgentSession,
        prompt: str,
        tools: Optional[List[Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[StreamEvent, None]:
        """底层流式对话驱动方法：仅包含 Session 运行状态维护与 LLM 服务流订阅"""
        session.start_chat()
        await self.repository.save_session(session)

        try:
            async for event in self.llm_service.stream_chat(
                session_id=session.id,
                prompt=prompt,
                tools=tools or [],
                metadata=metadata,
            ):
                yield event

            # 完成对话回归闲置状态
            session.complete_chat()
            await self.repository.save_session(session)

            # 发送 Done 完成标识
            yield StreamEvent.done(session_id=session.id)

        except Exception as e:
            # 异常熔断
            session.terminate()
            await self.repository.save_session(session)
            raise e