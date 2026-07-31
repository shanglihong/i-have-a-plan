"""Agent 领域流式事件类型定义

stream_chat 生成器统一 yield StreamEvent 实例，作为领域层的流协议契约。
基础设施层与应用层均从此模块导入，保证类型一致性。
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


class StreamEventType:
    """stream_chat 事件类型常量"""

    # LLM 生成的 token 片段
    # data: {"content": str}
    TOKEN = "TOKEN"

    # 工具调用开始
    # data: {"tool": str, "input": dict}
    TOOL_START = "TOOL_START"

    # 工具调用结束
    # data: {"tool": str, "output": Any}
    TOOL_END = "TOOL_END"

    # 卡片推送事件
    # data: {"card_type": str, "title": str, "content": str, "payload": dict, "card_id": str}
    CARD = "CARD"

    # 对话流完成标识
    # data: {"message_id": str, "session_id": str}
    DONE = "DONE"


@dataclass
class StreamEvent:
    """流式事件通用结构体

    stream_chat 产生的所有事件统一使用此结构，
    避免各处手动拼装裸 dict，同时获得类型提示与字段约束。
    """

    type: StreamEventType
    data: Dict[str, Any] = field(default_factory=dict)
    message_id: Optional[str] = None

    @property
    def is_token(self) -> bool:
        return self.type == StreamEventType.TOKEN
    
    @property
    def is_tool_start(self) -> bool:
        return self.type == StreamEventType.TOOL_START
    
    @property
    def is_tool_end(self) -> bool:
        return self.type == StreamEventType.TOOL_END
    
    @property
    def is_card(self) -> bool:
        return self.type == StreamEventType.CARD
    
    @property
    def is_done(self) -> bool:
        return self.type == StreamEventType.DONE

    def to_dict(self) -> Dict[str, Any]:
        """序列化为字典，供 SSE/JSON 层使用"""
        res = {"type": self.type, "data": self.data}
        if self.message_id:
            res["message_id"] = self.message_id
        return res

    # --- 静态工厂方法 ---

    @staticmethod
    def token(content: str, message_id: Optional[str] = None) -> "StreamEvent":
        """LLM 生成的 token 片段事件"""
        return StreamEvent(type=StreamEventType.TOKEN, data={"content": content}, message_id=message_id)

    @staticmethod
    def tool_start(tool: str, input: Dict[str, Any], message_id: Optional[str] = None) -> "StreamEvent":
        """工具调用开始事件"""
        return StreamEvent(type=StreamEventType.TOOL_START, data={"tool": tool, "input": input}, message_id=message_id)

    @staticmethod
    def tool_end(tool: str, output: Any, message_id: Optional[str] = None) -> "StreamEvent":
        """工具调用结束事件"""
        return StreamEvent(type=StreamEventType.TOOL_END, data={"tool": tool, "output": output}, message_id=message_id)

    @staticmethod
    def card(data: Dict[str, Any]) -> "StreamEvent":
        return StreamEvent(
            type=StreamEventType.CARD,
            data=data,
            message_id=data.get("message_id") or None,
        )

    @staticmethod
    def done(message_id: Optional[str] = None, session_id: Optional[str] = None) -> "StreamEvent":
        """对话流完成标识事件"""
        data = {}
        if message_id:
            data["message_id"] = message_id
        if session_id:
            data["session_id"] = session_id

        return StreamEvent(
            type=StreamEventType.DONE,
            data=data,
            message_id=message_id,
        )
