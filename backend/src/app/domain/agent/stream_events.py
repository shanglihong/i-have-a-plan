"""Agent 领域流式事件类型定义

stream_chat 生成器统一 yield StreamEvent 实例，作为领域层的流协议契约。
基础设施层与应用层均从此模块导入，保证类型一致性。
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict


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

    # 对话流完成标识
    # data: {"message_id": str, "session_id": str}
    DONE = "DONE"


@dataclass
class StreamEvent:
    """流式事件通用结构体

    stream_chat 产生的所有事件统一使用此结构，
    避免各处手动拼装裸 dict，同时获得类型提示与字段约束。
    """

    type: str
    data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """序列化为字典，供 SSE/JSON 层使用"""
        return {"type": self.type, "data": self.data}

    # --- 静态工厂方法 ---

    @staticmethod
    def token(content: str) -> "StreamEvent":
        """LLM 生成的 token 片段事件"""
        return StreamEvent(type=StreamEventType.TOKEN, data={"content": content})

    @staticmethod
    def tool_start(tool: str, input: Dict[str, Any]) -> "StreamEvent":
        """工具调用开始事件"""
        return StreamEvent(type=StreamEventType.TOOL_START, data={"tool": tool, "input": input})

    @staticmethod
    def tool_end(tool: str, output: Any) -> "StreamEvent":
        """工具调用结束事件"""
        return StreamEvent(type=StreamEventType.TOOL_END, data={"tool": tool, "output": output})

    @staticmethod
    def done(message_id: str, session_id: str) -> "StreamEvent":
        """对话流完成标识事件"""
        return StreamEvent(
            type=StreamEventType.DONE,
            data={"message_id": message_id, "session_id": session_id},
        )
