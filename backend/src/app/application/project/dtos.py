"""Project 应用层 DTO 契约模块"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from app.domain.project.entities import Project, TaskChain, Task


class CreatePlanProjectDTO(BaseModel):
    """创建计划项目 DTO"""
    title: str = Field(..., min_length=1, max_length=255, description="计划项目名称")
    type: Literal["PLAN"] = "PLAN"
    deadline: Optional[datetime] = Field(None, description="截止时间")
    skill_id: Optional[str] = Field(None, description="绑定的 Skill 模板 ID")


class UpdateProjectDTO(BaseModel):
    """更新项目元数据 DTO"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    deadline: Optional[datetime] = None


class CreateExperienceNoteDTO(BaseModel):
    """生成经验笔记 DTO"""
    experience_content: Optional[str] = Field(None, description="经验复盘总结文本")


class TaskDTO(BaseModel):
    """微观 Task 响应 DTO"""
    id: str
    title: str
    description: str
    sequence_order: int
    status: str
    depends_on_task_ids: List[str] = Field(default_factory=list)

    @classmethod
    def from_domain(cls, task: Task) -> "TaskDTO":
        return cls(
            id=task.id,
            title=task.title,
            description=task.description,
            sequence_order=task.sequence_order,
            status=task.status.value if hasattr(task.status, "value") else str(task.status),
            depends_on_task_ids=task.depends_on_task_ids,
        )


class TaskChainDTO(BaseModel):
    """中观 TaskChain 响应 DTO"""
    id: str
    title: str
    type: str
    sequence_order: int
    status: str
    book_id: Optional[str] = None
    chapter_id: Optional[str] = None
    tasks: List[TaskDTO] = Field(default_factory=list)

    @classmethod
    def from_domain(cls, chain: TaskChain) -> "TaskChainDTO":
        return cls(
            id=chain.id,
            title=chain.title,
            type=chain.chain_type.value if hasattr(chain.chain_type, "value") else str(chain.chain_type),
            sequence_order=chain.sequence_order,
            status=chain.status.value if hasattr(chain.status, "value") else str(chain.status),
            book_id=chain.book_id,
            chapter_id=chain.chapter_id,
            tasks=[TaskDTO.from_domain(t) for t in chain.tasks],
        )


class BookSummaryDTO(BaseModel):
    """关联书籍元数据摘要 DTO"""
    id: str
    file_name: str
    parsing_status: str
    total_chapters: int = 0
    total_word_count: int = 0


class ProjectResponseDTO(BaseModel):
    """双轨项目创建 201 响应 DTO"""
    id: str
    title: str
    type: str
    status: str
    assigned_agent_id: Optional[str] = None
    book_id: Optional[str] = None
    parsing_status: Optional[str] = None
    storage_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(
        cls,
        entity: Project,
        parsing_status: Optional[str] = None,
        storage_path: Optional[str] = None,
    ) -> "ProjectResponseDTO":
        return cls(
            id=entity.id,
            title=entity.title,
            type=entity.project_type.value,
            status=entity.status.value,
            assigned_agent_id=entity.assigned_agent_id,
            book_id=entity.book_id,
            parsing_status=parsing_status,
            storage_path=storage_path,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )


class ProjectListItemDTO(BaseModel):
    """项目列表元素 DTO"""
    id: str
    title: str
    type: str
    status: str
    progress: int
    deadline: Optional[datetime] = None
    assigned_agent_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(cls, entity: Project) -> "ProjectListItemDTO":
        return cls(
            id=entity.id,
            title=entity.title,
            type=entity.project_type.value,
            status=entity.status.value,
            progress=entity.progress,
            deadline=entity.deadline,
            assigned_agent_id=entity.assigned_agent_id,
            tags=entity.tags,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )


class ProjectListResponseDTO(BaseModel):
    """项目列表分页响应 DTO"""
    items: List[ProjectListItemDTO]
    total: int
    page: int
    size: int
    has_next: bool


class ProjectDetailDTO(BaseModel):
    """项目详情与完整任务树响应 DTO"""
    id: str
    title: str
    type: str
    status: str
    progress: int
    deadline: Optional[datetime] = None
    assigned_agent_id: Optional[str] = None
    book: Optional[BookSummaryDTO] = None
    task_chains: List[TaskChainDTO] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(cls, entity: Project, book_summary: Optional[BookSummaryDTO] = None) -> "ProjectDetailDTO":
        return cls(
            id=entity.id,
            title=entity.title,
            type=entity.project_type.value,
            status=entity.status.value,
            progress=entity.progress,
            deadline=entity.deadline,
            assigned_agent_id=entity.assigned_agent_id,
            book=book_summary,
            task_chains=[TaskChainDTO.from_domain(c) for c in entity.task_chains],
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )


class ExperienceNoteResponseDTO(BaseModel):
    """生成经验笔记响应 DTO"""
    project_id: str
    experience_note_id: str
