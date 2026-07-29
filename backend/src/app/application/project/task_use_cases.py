"""Task 模块应用层 UseCase 实现模块 (管道与编排层)"""

from typing import List

from datetime import datetime, timezone
from app.domain.note import NoteQueryDomainService, NoteStateDomainService, MaterialNote
from app.domain.project.entities import TaskStatus, TaskChainType
from app.domain.project.services.project_query_service import ProjectQueryDomainService
from app.domain.project.services.task_operation_service import TaskOperationDomainService
from app.domain.project.services.task_state_service import TaskStateDomainService
from app.domain.project.services.task_query_service import TaskQueryDomainService

# DTO 导入
from app.application.project.task_dtos import (
    CreateTaskDTO,
    CreateTaskChainDTO,
    UpdateTaskStatusDTO,
    TaskQueryFilterDTO,
    CreateOrAttachTaskNoteDTO,
    TaskVO,
    TaskChainVO,
    TaskTreeResponse,
    TaskStatusUpdateResponse,
    ProcessedProgressDTO,
    MaterialNoteVO,
    AttachNoteResponse,
)


class GetTaskTreeUseCase:
    """获取项目完整任务树结构 UseCase (纯管道)"""

    def __init__(self, project_query_service: ProjectQueryDomainService):
        self.project_query_service = project_query_service

    async def execute(self, project_id: str) -> TaskTreeResponse:
        project = await self.project_query_service.get_project_detail(project_id)
        project_progress = project.get_project_progress()

        chains_vo = []
        for chain in project.task_chains:
            # 重新评估并计算链的进度
            chain.recalculate_progress_and_status()
            
            tasks_vo = [TaskVO.from_domain(t) for t in chain.tasks]
            chains_vo.append(TaskChainVO.from_domain(chain, tasks_vo=tasks_vo))

        return TaskTreeResponse(
            project_id=project_id,
            project_progress=project_progress,
            chains=chains_vo
        )


class TaskQueryUseCase:
    """多条件过滤查询 Task 列表 UseCase (纯管道)"""

    def __init__(self, project_query_service: ProjectQueryDomainService):
        self.project_query_service = project_query_service

    async def list_tasks(self, project_id: str, filter_dto: TaskQueryFilterDTO) -> List[TaskVO]:
        project = await self.project_query_service.get_project_detail(project_id)
        all_tasks = project.all_tasks

        # 内存过滤
        filtered = all_tasks
        if filter_dto.status:
            filtered = [t for t in filtered if t.status.value == filter_dto.status]
        if filter_dto.task_chain_id:
            filtered = [t for t in filtered if t.task_chain_id == filter_dto.task_chain_id]
        if filter_dto.search_keyword:
            kw = filter_dto.search_keyword.lower()
            filtered = [t for t in filtered if kw in t.title.lower() or kw in t.description.lower()]

        return [TaskVO.from_domain(t) for t in filtered]


class ManageTaskTreeUseCase:
    """任务树（任务链与原子任务）创建管理 UseCase (纯管道)"""

    def __init__(self, operation_service: TaskOperationDomainService, state_service: TaskStateDomainService):
        self.operation_service = operation_service
        self.state_service = state_service

    async def create_chain(self, dto: CreateTaskChainDTO) -> TaskChainVO:
        # 直接委托给领域服务，不允许应用层处理具体的实体逻辑
        chain = await self.state_service.create_chain(
            project_id=dto.project_id,
            title=dto.title,
            chain_type=TaskChainType(dto.type),
            sequence_order=dto.sequence_order
        )
        return TaskChainVO.from_domain(chain, tasks_vo=[])

    async def create_task(self, dto: CreateTaskDTO) -> TaskVO:
        # 直接委托给领域服务做状态初判、DAG 依赖校验及持久化
        task = await self.state_service.create_task(
            task_chain_id=dto.task_chain_id,
            title=dto.title,
            description=dto.description or "",
            sequence_order=dto.sequence_order,
            parent_task_id=dto.parent_task_id,
            depends_on_task_ids=dto.depends_on_task_ids
        )
        return TaskVO.from_domain(task)


class ChangeTaskStatusUseCase:
    """修改任务状态并级联解算依赖与进度 UseCase (编排层)"""

    def __init__(
        self,
        status_progress_service: TaskStateDomainService,
    ):
        self.status_progress_service = status_progress_service

    async def execute(self, task_id: str, dto: UpdateTaskStatusDTO) -> TaskStatusUpdateResponse:
        target_status = TaskStatus(dto.status)
        
        # 委托给领域服务执行状态扭转、级联锁解、进度校准及事务保存
        project, unlocked_tasks, locked_tasks = (
            await self.status_progress_service.update_task_status(task_id, target_status)
        )
        task = project.get_task(task_id)
        unlocked_ids = [u.id for u in unlocked_tasks]
        return TaskStatusUpdateResponse(
            task_id=task_id,
            status=task.status.value,
            unlocked_task_ids=unlocked_ids,
            chain_progress=project.get_task_chain(task.task_chain_id or "").get_progress(),
            project_progress=project.get_project_progress()
        )


class TaskStatusProgressUseCase:
    """手动刷新校准任务链进度 UseCase (纯管道)"""

    def __init__(self, status_progress_service: TaskStateDomainService):
        self.status_progress_service = status_progress_service

    async def manual_recalculate_progress(self, chain_id: str) -> ProcessedProgressDTO:
        project, chain = (
            await self.status_progress_service.recalculate_chain_progress(chain_id)
        )
        return ProcessedProgressDTO(
            task_chain_id=chain_id,
            chain_status=chain.status.value,
            chain_progress=chain.progress,
            project_progress=project.progress
        )


class TaskNoteAttachmentUseCase:
    """素材笔记与 Task 关联挂载/撰写 UseCase (编排层)"""

    def __init__(
        self,
        query_service: TaskQueryDomainService,
        operation_service: TaskOperationDomainService,
        note_query_service: NoteQueryDomainService,
        note_state_service: NoteStateDomainService,

    ):
        self.query_service = query_service
        self.operation_service = operation_service
        self.note_query_service = note_query_service
        self.note_state_service = note_state_service

    async def list_notes(self, task_id: str) -> List[MaterialNoteVO]:
        # 直接委托领域服务查询完整的笔记实体列表和项目 ID
        note_ids = await self.query_service.list_attached_note_ids(task_id)
        notes = await self.note_query_service.get_material_note_by_ids(note_ids)
        notes_vo = []
        for note in notes:
            notes_vo.append(
                MaterialNoteVO(
                    id=note.id,
                    project_id=note.project_id,
                    task_id=task_id,
                    source_type="USER_THOUGHT",
                    original_snippet="",
                    paraphrase=note.user_interpretation,
                    scenario_context="Task 关联笔记",
                    tags=note.tags,
                    created_at=note.created_at.isoformat() if hasattr(note.created_at, "isoformat") else str(note.created_at)
                )
            )
        return notes_vo

    async def attach_or_create(self, task_id: str, dto: CreateOrAttachTaskNoteDTO) -> AttachNoteResponse:
        if dto.material_note_id:
            await self.operation_service.attach_note(task_id, dto.material_note_id)
        # 先创建note然后绑定
        note = MaterialNote(
            task_id=task_id,
            user_interpretation=dto.paraphrase or "",
            raw_quote=dto.original_snippet,
            context_reflection=dto.scenario_context,
            tags=dto.tags
        )
        await self.note_state_service.create_material_note(note)
        await self.operation_service.attach_note(task_id, note.id)

        return AttachNoteResponse(
            task_id=task_id,
            material_note_id=dto.material_note_id or note.id,
        )

    async def detach(self, task_id: str, note_id: str) -> None:
        await self.operation_service.detach_note(task_id, note_id)
