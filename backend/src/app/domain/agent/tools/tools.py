"""Agent 工具实现模块

将领域 Port 适配器包装为 LangChain 可调用的 @tool 函数。
通过工厂函数注入领域端口依赖，保证工具函数无状态且可复用。
"""

from typing import Any, Dict, List, Optional
from langchain_core.tools import tool

from app.domain.agent.tools.tool_ports import BookQueryPort, ProjectTaskPort


def make_get_book_content_tool(book_query_port: BookQueryPort):
    """工厂：创建书籍内容查询工具，注入 BookQueryPort 依赖"""

    @tool
    async def get_book_content(block_id: str) -> Dict[str, Any]:
        """根据锚点切片 ID 查询书籍正文内容片段。

        当需要引用或查阅书籍中的具体段落时调用此工具。

        Args:
            block_id: 内容块的唯一标识符（锚点 ID）

        Returns:
            包含内容块详细信息的字典
        """
        return await book_query_port.get_content_block_by_id(block_id)

    return get_book_content


def make_attach_task_tree_tool(project_task_port: ProjectTaskPort):
    """工厂：创建任务树挂载工具，注入 ProjectTaskPort 依赖"""

    @tool
    async def attach_task_tree(project_id: str, task_chains: List[Any]) -> bool:
        """将生成的任务链结构挂载到指定项目，完成任务树的持久化。

        在完成任务拆解分析后，调用此工具将结构化任务数据落盘到项目中。

        Args:
            project_id: 目标项目 ID
            task_chains: 任务链列表，每个元素代表一条完整的任务执行链

        Returns:
            挂载是否成功
        """
        return await project_task_port.attach_generated_task_tree(
            project_id=project_id,
            task_chains_data={"task_chains": task_chains},
        )

    return attach_task_tree


def build_tools(
    book_query_port: Optional[BookQueryPort] = None,
    project_task_port: Optional[ProjectTaskPort] = None,
) -> list:
    """按传入的 Port 组装可用工具列表，Port 为 None 时跳过对应工具"""
    tools = []
    if book_query_port:
        tools.append(make_get_book_content_tool(book_query_port))
    if project_task_port:
        tools.append(make_attach_task_tree_tool(project_task_port))
    return tools
