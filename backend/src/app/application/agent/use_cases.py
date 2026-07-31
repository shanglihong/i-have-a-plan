"""Agent 领域应用层 Use Cases 流程编排模块"""

from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple
from app.domain.agent.entities import AgentMode, TriggerType, ActionCard
from app.domain.agent.context import BaseAgentContext
from app.domain.agent.exceptions import AgentSessionNotFoundException
from app.domain.agent.ports import AgentRepositoryPort, LLMServicePort
from app.domain.agent.service.agent_chat_service import AgentChatDomainService
from app.domain.agent.service.agent_card_service import AgentCardDomainService
from app.domain.agent.tools import BookQueryPort, ProjectTaskPort
from app.domain.agent.stream_events import StreamEvent


class AgentChatUseCase:
    """Agent 对话流核心 UseCase 编排应用服务"""

    def __init__(
        self,
        repository: AgentRepositoryPort,
        llm_service: LLMServicePort,
        tool_book_query: BookQueryPort,
        tool_project_task_port: ProjectTaskPort,
        card_service: Optional[AgentCardDomainService] = None,
    ):
        self.repository = repository
        self.llm_service = llm_service
        self.chat_service = AgentChatDomainService(
            repository=repository,
            llm_service=llm_service,
            tool_book_query=tool_book_query,
            tool_project_task_port=tool_project_task_port,
        )
        self.card_service = card_service or AgentCardDomainService(llm_service=llm_service)

    async def execute(
        self,
        project_id: str,
        mode: AgentMode,
        trigger_type: TriggerType,
        context: BaseAgentContext,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """应用层串联：卡片履约前置、驱动流对话、SSE 解析推送与卡片保存"""
        session = await self.repository.get_active_session(project_id)
        if not session:
            raise AgentSessionNotFoundException(f"未找到项目 {project_id} 的活动 Agent 会话")

        card_id = getattr(context, "card_id", None)
        card_response = getattr(context, "card_response", None)
        message_id = getattr(context, "message_id", None)

        # 1. 前置处理卡片履约记录
        if trigger_type == TriggerType.CARD_INTERACTION and card_id:
            await self.card_service.record_card_fulfillment(
                session_id=session.id,
                card_id=card_id,
                card_response=card_response,
                message_id=message_id,
            )

        # 2. 驱动底层 Chat 领域服务，并在应用层解析 SSE 事件流
        async for event in self.chat_service.stream_chat(
            project_id=project_id,
            mode=mode,
            trigger_type=trigger_type,
            context=context,
        ):
            if event.is_token:
                yield StreamEvent.token(event.data["content"], message_id=event.message_id)
            elif event.is_tool_start or event.is_tool_end:
                yield event
                # 3. 拦截 present_card 工具完成事件：应用层推送卡片并调用 CardService 持久化
                if event.is_tool_end and event.data.get("tool") == "present_card":
                    output = event.data.get("output", {})
                    if isinstance(output, dict):
                        yield StreamEvent.card(output)
                        card_entity = ActionCard.from_dict(output)
                        await self.card_service.save_card_to_message(
                            session_id=session.id,
                            card=card_entity,
                            message_id=event.message_id,
                        )

            else:
                yield event


class AgentQueryUseCase:
    """Agent 查询 UseCase 应用服务"""

    def __init__(self, repository: AgentRepositoryPort, llm_service: LLMServicePort):
        self.repository = repository
        self.llm_service = llm_service

    async def list_messages(
        self, session_id: str, page: int = 1, page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        raw_msgs = await self.llm_service.get_messages(session_id)
        formatted_messages = []
        for msg in raw_msgs:
            sender_type = "USER" if msg.type == "human" else ("AGENT" if msg.type == "ai" else "SYSTEM_TRIGGER")
            formatted_msg = {
                "id": msg.id,
                "sender_type": sender_type,
                "content": msg.content,
                "action_cards": msg.additional_kwargs.get("action_cards", []),
                "source_anchor_id": msg.additional_kwargs.get("source_anchor_id"),
                "trigger_type": "DISCUSS",
            }
            formatted_messages.append(formatted_msg)

        start = (page - 1) * page_size
        end = start + page_size
        return formatted_messages[start:end], len(formatted_messages)
