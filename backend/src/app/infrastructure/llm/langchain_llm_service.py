"""基于 LangGraph 和 SQLite 持久化大模型对话服务实现"""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator, Dict, List, Optional, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.graph.state import CompiledStateGraph
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.prebuilt import ToolNode, tools_condition
from app.domain.agent.ports import LLMServicePort
from app.utils.path import get_db_dir
from typing_extensions import TypedDict
from app.infrastructure.llm.strategies import ContextCompressStrategy, get_compress_strategy
from app.domain.agent.stream_events import StreamEvent, StreamEventType


def get_database_path() -> Path:
    """获取 SQLite 数据库物理文件绝对路径"""
    return get_db_dir() / "llm_checkpoints.db"

class State(TypedDict):
    """LangGraph 状态机状态类型定义"""
    messages: List[BaseMessage]


class LangChainLLMService(LLMServicePort):
    """基于 LangGraph 且支持持久化与上下文压缩的大模型服务"""

    # --- LangGraph 节点名 ---
    CHATBOT_NODE = "chatbot"
    TOOLS_NODE = "tools"

    # --- LangGraph astream_events 事件名 ---
    EVENT_CHAT_MODEL_STREAM = "on_chat_model_stream"
    EVENT_TOOL_START = "on_tool_start"
    EVENT_TOOL_END = "on_tool_end"

    def __init__(
        self,
        strategy: Optional[ContextCompressStrategy] = None,
    ):
        api_key = os.getenv("OPENAI_API_KEY")
        api_base = os.getenv("OPENAI_API_BASE")
        model_name = os.getenv("LLM_MODEL_NAME") or "deepseek-chat"

        if api_key:
            self.llm = ChatOpenAI(
                model=model_name,
                api_key=api_key,
                base_url=api_base,
                streaming=True,
            )
        else:
            self.llm = None

        # 从环境变量动态加载大模型历史裁剪策略
        if strategy is None:
            strategy_type = os.getenv("LLM_COMPRESS_STRATEGY") or "SLIDING_WINDOW"
            self.strategy = get_compress_strategy(strategy_type)
        else:
            self.strategy = strategy

    def _build_workflow(self, tools: Optional[List] = None, llm=None) -> StateGraph:
        """根据传入的工具集和 LLM 实例构建工作流

        有工具时升级为 ReAct 模式：
          chatbot → (有 tool_calls) → tools → chatbot → ...
          chatbot → (无 tool_calls) → END
        无工具时退化为普通单轮节点。
        """
        _tools = tools or []
        _llm = llm or self.llm

        async def chatbot(state: State):
            compressed_messages = self.strategy.compress(state["messages"])
            response = await _llm.ainvoke(compressed_messages)
            return {"messages": [response]}

        workflow = StateGraph(State)
        workflow.add_node(self.CHATBOT_NODE, chatbot)
        workflow.add_edge(START, self.CHATBOT_NODE)

        if _tools:
            tool_node = ToolNode(tools=_tools)
            workflow.add_node(self.TOOLS_NODE, tool_node)
            workflow.add_conditional_edges(self.CHATBOT_NODE, tools_condition)
            workflow.add_edge(self.TOOLS_NODE, self.CHATBOT_NODE)
        else:
            workflow.add_edge(self.CHATBOT_NODE, END)

        return workflow

    def _prepare_inputs(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        source_anchor_id: Optional[str] = None,
    ) -> Dict[str, List[BaseMessage]]:
        """准备工作流输入消息"""
        messages = []
        if system_instruction:
            messages.append(SystemMessage(content=system_instruction))
        
        human_msg = HumanMessage(content=prompt)
        if source_anchor_id:
            human_msg.additional_kwargs["source_anchor_id"] = source_anchor_id
        messages.append(human_msg)
        return {"messages": messages}

    async def _parse_event_stream(
        self, event_stream
    ) -> AsyncGenerator[StreamEvent, None]:
        """从 astream_events 解析并 yield 结构化事件

        捕获三类事件：
        - on_chat_model_stream (chatbot 节点): TOKEN 片段
        - on_tool_start        (tools  节点): 工具调用开始
        - on_tool_end          (tools  节点): 工具调用结束
        """
        async for event in event_stream:
            event_type = event["event"]
            node = event["metadata"].get("langgraph_node")

            # LLM 流式 token，仅取 chatbot 节点输出（排除 ToolNode 内部调 LLM 的响应）
            if event_type == self.EVENT_CHAT_MODEL_STREAM and node == self.CHATBOT_NODE:
                chunk = event["data"]["chunk"]
                if chunk.content:
                    yield StreamEvent.token(chunk.content)

            # 工具执行开始
            elif event_type == self.EVENT_TOOL_START and node == self.TOOLS_NODE:
                yield StreamEvent.tool_start(
                    tool=event["name"],
                    input=event["data"].get("input", {}),
                )

            # 工具执行结束
            elif event_type == self.EVENT_TOOL_END and node == self.TOOLS_NODE:
                yield StreamEvent.tool_end(
                    tool=event["name"],
                    output=event["data"].get("output"),
                )

    @asynccontextmanager
    async def _get_compiled_app(
        self, tools: Optional[List] = None
    ) -> AsyncGenerator[CompiledStateGraph, None]:
        """异步上下文管理器，根据传入工具集构建并返回编译的工作流"""
        _tools = tools or []
        _llm = self.llm.bind_tools(_tools) if (self.llm and _tools) else self.llm
        workflow = self._build_workflow(tools=_tools, llm=_llm)

        db_path = get_database_path()
        db_path.parent.mkdir(parents=True, exist_ok=True)
        async with AsyncSqliteSaver.from_conn_string(str(db_path)) as checkpointer:
            await checkpointer.setup()
            yield workflow.compile(checkpointer=checkpointer)

    async def stream_chat(
        self,
        session_id: str,
        prompt: str,
        system_instruction: Optional[str] = None,
        source_anchor_id: Optional[str] = None,
        tools: Optional[List] = None,
    ) -> AsyncGenerator[StreamEvent, None]:
        """使用 LangGraph 异步 SQLite checkpointer 执行流式对话生成

        Args:
            tools: 当前调用场景的工具列表，为空则退化为纯对话模式。
        """
        if not self.llm:
            raise ValueError("OPENAI_API_KEY is not configured in environment variables.")

        async with self._get_compiled_app(tools=tools) as app:
            inputs = self._prepare_inputs(prompt, system_instruction, source_anchor_id)
            config: RunnableConfig = {"configurable": {"thread_id": session_id}}
            async for event in self._parse_event_stream(app.astream_events(inputs, config, version="v2")):
                yield event

    async def get_messages(self, session_id: str) -> List[BaseMessage]:
        """获取指定会话的历史消息列表"""
        async with self._get_compiled_app() as app:
            config: RunnableConfig = {"configurable": {"thread_id": session_id}}
            state = await app.aget_state(config)
            if state.values and "messages" in state.values:
                return state.values["messages"]
            return []

    async def get_message_by_id(self, session_id: str, message_id: str) -> Optional[BaseMessage]:
        """获取会话中指定 ID 的消息"""
        messages = await self.get_messages(session_id)
        for msg in messages:
            if msg.id == message_id:
                return msg
        return None

    async def update_message_kwargs(self, session_id: str, message_id: str, additional_kwargs: dict) -> None:
        """更新指定消息的 additional_kwargs"""
        messages = await self.get_messages(session_id)
        target_msg: Optional[BaseMessage] = None
        for msg in messages:
            if msg.id == message_id:
                target_msg = msg
                break
        
        if target_msg is not None:
            target_msg.additional_kwargs.update(additional_kwargs)
            async with self._get_compiled_app() as app:
                config: RunnableConfig = {"configurable": {"thread_id": session_id}}
                await app.aupdate_state(config, {"messages": [target_msg]}, as_node=self.CHATBOT_NODE)
