"""Agent 对话核心流程领域服务"""

from app.domain.agent.tools import (
    BookQueryPort,
    ProjectTaskPort,
    make_attach_task_tree_tool,
    make_get_book_content_tool,
)
import uuid
from typing import Any, AsyncGenerator, Dict, Optional
from app.domain.agent.entities import AgentMode, TriggerType, PromptContext
from app.domain.agent.exceptions import (
    AgentSessionNotFoundException,
)
from app.domain.agent.ports import (
    AgentRepositoryPort,
    LLMServicePort,
)
from app.domain.agent.prompt import PromptFactory
from app.domain.agent.stream_events import StreamEvent, StreamEventType


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

        self.tools_by_mode = {
            AgentMode.TASK_BREAKDOWN: [make_attach_task_tree_tool(tool_project_task_port)],
            AgentMode.READING_COMPANION: [make_get_book_content_tool(tool_book_query)],
        }

    async def stream_chat(
        self,
        project_id: str,
        mode: AgentMode,
        trigger_type: TriggerType,
        context: PromptContext,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """流式对话与大模型交互"""
        session = await self.repository.get_active_session(project_id)
        if not session:
            raise AgentSessionNotFoundException(f"未找到项目 {project_id} 的活动 Agent 会话")

        # 开始运行
        session.start_chat()
        await self.repository.save_session(session)

        formatted_prompt = PromptFactory.create_prompt( # TODO 判断如果是read，填充skill的md
            mode=mode,
            trigger_type=trigger_type,
            context=context,
        )

        try:
            # 真实调用大模型流式输出
            full_response_content = ""
            async for event in self.llm_service.stream_chat(
                session_id=session.id,
                prompt=formatted_prompt,
                metadata=metadata,
                tools=self.tools_by_mode.get(mode, []),
            ):
                if event.type == StreamEventType.TOKEN:
                    chunk = event.data["content"]
                    full_response_content += chunk
                    yield StreamEvent.token(chunk)
                elif event.type in (StreamEventType.TOOL_START, StreamEventType.TOOL_END):
                    # 工具调用事件透传给前端，便于展示工具执行状态
                    yield event

            # 保存 Agent 消息并执行任务挂载 TODO 在提示词中体现，ai返回一定的标识
            action_cards = []

            if mode == AgentMode.TASK_BREAKDOWN:
                print("----------------------------------------")
                # TODO 真正的挂载工具 ---------------------
                # task_chains = TaskTreeParserService.parse_task_tree_json(full_response_content)
                # if task_chains:
                #     # 挂载任务树
                #     success = await self.project_task_port.attach_generated_task_tree(
                #         project_id=project_id,
                #         task_chains_data={"task_chains": task_chains}
                #     )
                #     if success:
                #         action_cards.append({
                #             "type": "TASK_TREE",
                #             "data": task_chains,
                #         })
                #         yield {"type": "TASK_TREE", "data": {"task_chains": task_chains}}

            # 如果生成了卡片，回写到大模型最后的消息元数据中
            if action_cards:
                messages = await self.llm_service.get_messages(session.id)
                if messages:
                    await self.llm_service.update_message_kwargs(
                        session_id=session.id,
                        message_id=messages[-1].id,
                        additional_kwargs={"action_cards": action_cards}
                    )

            # 完成对话
            session.complete_chat()
            await self.repository.save_session(session)

            # 获取最后一条大模型生成的消息作为前端 message_id 契约返回
            messages = await self.llm_service.get_messages(session.id)
            agent_msg_id = messages[-1].id if messages else f"msg_{uuid.uuid4().hex[:8]}"

            # 发送 Done 完成标识
            yield StreamEvent.done(
                message_id=agent_msg_id,
                session_id=session.id,
            )

        except Exception as e:
            # 异常熔断
            session.terminate()
            await self.repository.save_session(session)
            raise e