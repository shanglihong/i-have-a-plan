"""Task 模块应用层 DTO 契约模块"""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from app.domain.project.entities import Task, TaskChain


class CreateTaskDTO(BaseModel):
    """创建原子任务 DTO"""
    task_chain_id: str = Field(..., description="所属任务链 ID")
    title: str = Field(..., max_length=100, description="任务标题")
    description: Optional[str] = Field(None, description="任务描述")
    sequence_order: int = Field(1, description="排序顺序")
    parent_task_id: Optional[str] = Field(None, description="父任务 ID")
    depends_on_task_ids: List[str] = Field(default_factory=list, description="依赖的前置任务 ID 列表")
    deadline: Optional[datetime] = Field(None, description="截止日期")


class CreateTaskChainDTO(BaseModel):
    """创建任务链 DTO"""
    project_id: str = Field(..., description="所属项目 ID")
    title: str = Field(..., max_length=100, description="任务链标题")
    type: Literal["READING_CHAPTER", "PLAN_STAGE", "DEFAULT", "RETROSPECTIVE"] = Field("DEFAULT", description="任务链类型")
    sequence_order: int = Field(1, description="排序顺序")


class UpdateTaskStatusDTO(BaseModel):
    """更新任务状态 DTO"""
    status: Literal["PENDING", "RUNNING", "COMPLETED", "BLOCKED"] = Field(..., description="目标状态")


class TaskQueryFilterDTO(BaseModel):
    """项目 Task 列表过滤 DTO"""
    status: Optional[Literal["PENDING", "RUNNING", "COMPLETED", "BLOCKED"]] = None
    task_chain_id: Optional[str] = None
    search_keyword: Optional[str] = None


class CreateOrAttachTaskNoteDTO(BaseModel):
    """撰写笔记或绑定已有笔记 DTO"""
    material_note_id: Optional[str] = Field(None, description="绑定已有素材笔记 ID (场景 B)")
    paraphrase: Optional[str] = Field(None, description="个人思考转述感悟 (场景 A)")
    original_snippet: Optional[str] = Field(None, description="参考片段 (场景 A)")
    scenario_context: Optional[str] = Field(None, description="应用情景 (场景 A)")
    tags: List[str] = Field(default_factory=list, description="笔记标签")


class TaskVO(BaseModel):
    """微观任务展示对象 VO"""
    id: str
    task_chain_id: str
    title: str
    description: Optional[str]
    sequence_order: int
    status: str
    parent_task_id: Optional[str]
    depends_on_task_ids: List[str]
    created_at: str

    @classmethod
    def from_domain(cls, entity: Task) -> "TaskVO":
        return cls(
            id=entity.id,
            task_chain_id=entity.task_chain_id or "",
            title=entity.title,
            description=entity.description,
            sequence_order=entity.sequence_order,
            status=entity.status.value,
            parent_task_id=entity.parent_task_id,
            depends_on_task_ids=entity.depends_on_task_ids,
            created_at=entity.created_at.isoformat() if hasattr(entity.created_at, "isoformat") else str(entity.created_at)
        )


class TaskChainVO(BaseModel):
    """中观任务链展示对象 VO"""
    id: str
    project_id: str
    title: str
    sequence_order: int
    status: str
    type: str
    tasks: List[TaskVO] = Field(default_factory=list)
    progress: float

    @classmethod
    def from_domain(cls, chain: TaskChain, tasks_vo: List[TaskVO]) -> "TaskChainVO":
        return cls(
            id=chain.id,
            project_id=chain.project_id or "",
            title=chain.title,
            sequence_order=chain.sequence_order,
            status=chain.status.value,
            type=chain.chain_type.value,
            tasks=tasks_vo or [TaskVO.from_domain(t) for t in chain.tasks],
            progress=chain.progress
        )


class TaskTreeResponse(BaseModel):
    """完整任务树响应"""
    project_id: str
    project_progress: float
    chains: List[TaskChainVO]


class TaskStatusUpdateResponse(BaseModel):
    """原子任务状态更新响应"""
    task_id: str
    status: str
    unlocked_task_ids: List[str]
    chain_progress: float
    project_progress: float


class ProcessedProgressDTO(BaseModel):
    """手动校准任务链进度响应"""
    task_chain_id: str
    chain_status: str
    chain_progress: float
    project_progress: float


class MaterialNoteVO(BaseModel):
    """挂载笔记展示对象 VO"""
    id: str
    project_id: str
    task_id: Optional[str]
    source_type: str
    original_snippet: Optional[str]
    paraphrase: str
    scenario_context: Optional[str]
    tags: List[str]
    created_at: str


class AttachNoteResponse(BaseModel):
    """挂载笔记响应"""
    task_id: str
    material_note_id: str
    attached_note_count: int
