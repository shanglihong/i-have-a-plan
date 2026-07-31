"""Agent 卡片履约与持久化领域服务"""

from typing import Any, Dict, List, Optional
from app.domain.agent.entities import ActionCard
from app.domain.agent.ports import LLMServicePort

# 消息附加属性常量与类型契约 (消除魔法字符串)
ACTION_CARDS_KEY = "action_cards"
TARGET_MESSAGE_TYPES = ("ai", "tool")


class AgentCardDomainService:
    """Agent 卡片履约与持久化领域服务"""

    def __init__(self, llm_service: LLMServicePort):
        self.llm_service = llm_service

    async def save_card_to_message(
        self, session_id: str, card: ActionCard, message_id: Optional[str] = None
    ) -> None:
        """将 ActionCard 实体追加保存至指定 ID 或最近的消息 additional_kwargs 中"""
        target_msg = None
        if message_id:
            target_msg = await self.llm_service.get_message_by_id(session_id, message_id)

        messages = [target_msg] if target_msg else reversed(await self.llm_service.get_messages(session_id))
        for msg in messages:
            if msg and msg.type in TARGET_MESSAGE_TYPES:
                kwargs = dict(msg.additional_kwargs or {})
                raw_cards = list(kwargs.get(ACTION_CARDS_KEY, []))
                
                # 转换为 ActionCard 实体列表进行数据处理
                card_entities: List[ActionCard] = [
                    ActionCard.from_dict(c) for c in raw_cards if isinstance(c, dict)
                ]
                
                # 实体级别的判重与追加
                if not any(c.card_id == card.card_id for c in card_entities):
                    card_entities.append(card)
                    updated_raw_cards = [c.to_dict() for c in card_entities]
                    await self.llm_service.update_message_kwargs(
                        session_id=session_id,
                        message_id=msg.id,
                        additional_kwargs={ACTION_CARDS_KEY: updated_raw_cards},
                    )
                break

    async def record_card_fulfillment(
        self,
        session_id: str,
        card_id: str,
        card_response: Optional[Dict[str, Any]] = None,
        message_id: Optional[str] = None,
    ) -> None:
        """记录更新卡片在历史消息中的履约状态与回答"""
        target_msg = None
        if message_id:
            target_msg = await self.llm_service.get_message_by_id(session_id, message_id)

        messages = [target_msg] if target_msg else reversed(await self.llm_service.get_messages(session_id))
        for msg in messages:
            if msg:
                kwargs = msg.additional_kwargs or {}
                raw_cards = kwargs.get(ACTION_CARDS_KEY, [])
                
                # 反序列化构建 ActionCard 领域实体列表
                card_entities: List[ActionCard] = [
                    ActionCard.from_dict(c) for c in raw_cards if isinstance(c, dict)
                ]
                card_matched = False

                for card_entity in card_entities:
                    if card_entity.card_id == card_id:
                        # 调用 ActionCard 领域实体方法触发履约变更
                        card_entity.mark_interacted(user_response=card_response)
                        card_matched = True

                if card_matched:
                    updated_raw_cards = [c.to_dict() for c in card_entities]
                    await self.llm_service.update_message_kwargs(
                        session_id=session_id,
                        message_id=msg.id,
                        additional_kwargs={ACTION_CARDS_KEY: updated_raw_cards},
                    )
                    break
