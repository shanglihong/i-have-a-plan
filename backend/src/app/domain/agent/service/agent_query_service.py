"""Agent 历史对话查询领域服务"""

from typing import Any, Dict, List, Tuple
from app.domain.agent.ports import AgentRepositoryPort, LLMServicePort


class AgentQueryDomainService:
    """Agent 历史对话查询领域服务"""

    def __init__(self, repository: AgentRepositoryPort, llm_service: LLMServicePort):
        self.repository = repository
        self.llm_service = llm_service

    async def list_messages(
        self, session_id: str, page: int = 1, page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        """分页获取会话消息历史"""
        raw_msgs = await self.llm_service.get_messages(session_id)
        
        formatted_messages = []
        for msg in raw_msgs:
            if msg.type == "human":
                sender_type = "USER"
            elif msg.type == "ai":
                sender_type = "AGENT"
            else:
                sender_type = "SYSTEM_TRIGGER"

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
