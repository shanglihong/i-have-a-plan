"""结构化任务树拆解挂载 Agent 工具模块"""

from typing import List
from langchain_core.tools import tool
from app.domain.agent.tools.tool_ports import (
    TaskInput,
    TaskChainInput,
    ProjectTaskPort,
)


def make_attach_task_tree_tool(project_task_port: ProjectTaskPort):
    """工厂：创建任务树挂载工具，注入 ProjectTaskPort 依赖"""

    @tool
    async def attach_task_tree(project_id: str, task_chains: List[TaskChainInput]) -> bool:
        """将生成的结构化任务树挂载持久化落盘到指定项目上。

        在完成对用户目标的任务拆解分析后，调用此工具将包含阶段与子任务的任务链落盘。

        Args:
            project_id: 目标项目 ID
            task_chains: 任务链列表，包含阶段标题、排序及下属的微观任务步骤列表

        Returns:
            挂载落盘是否成功
        """
        return await project_task_port.attach_generated_task_tree(
            project_id=project_id,
            task_chains=task_chains,
        )

    return attach_task_tree
