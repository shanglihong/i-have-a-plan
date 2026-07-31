"""Agent 工具所依赖的外部领域 Outbound Ports 与契约数据结构

工具在调用时需要跨领域访问能力（如查询书籍内容、挂载任务树），
这些依赖与交互数据模型通过此处定义的 Port 接口与 Schema 解耦，
由 container.py 在外部注入具体实现。
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel, Field


class BookContentBlock(BaseModel):
    """书籍切片正文及其元信息结构对象"""

    block_id: str = Field(..., description="内容块/切片块的唯一标识符（锚点 ID）")
    content: str = Field(..., description="对应切片的正文文本内容")
    chapter_title: Optional[str] = Field(None, description="所属章节的标题")
    book_id: Optional[str] = Field(None, description="所属书籍 ID")
    sequence_order: Optional[int] = Field(None, description="章节中的顺序索引")


class TaskInput(BaseModel):
    """微观可执行任务步骤定义"""

    title: str = Field(..., description="任务标题，须简明具体可操作")
    description: Optional[str] = Field(None, description="任务步骤的详细操作说明或要点")
    sequence_order: int = Field(1, description="任务在所属阶段内从 1 开始的顺序号")


class TaskChainInput(BaseModel):
    """中观阶段任务链定义"""

    title: str = Field(..., description="任务阶段链条标题，如 '阶段一：环境搭建与基础准备'")
    sequence_order: int = Field(1, description="阶段链条的顺序号")
    type: str = Field("DEFAULT", description="阶段类型，如 DEFAULT, PLAN_STAGE, READING_CHAPTER 等")
    tasks: List[TaskInput] = Field(default_factory=list, description="该阶段下包含的子任务列表")


class BookQueryPort(ABC):
    """Book 领域正文与锚点切片查询端口"""

    @abstractmethod
    async def get_content_block_by_id(self, block_id: str, book_id: str) -> BookContentBlock:
        """获取指定切片的内容对象描述"""
        pass


class ProjectTaskPort(ABC):
    """Project/Task 领域任务树挂载端口"""

    @abstractmethod
    async def attach_generated_task_tree(self, project_id: str, task_chains: List[TaskChainInput]) -> bool:
        """将生成的任务树挂载到指定项目上，执行事务级别的落盘"""
        pass

