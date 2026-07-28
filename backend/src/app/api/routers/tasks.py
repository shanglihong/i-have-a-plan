"""FastAPI 接入层 - 任务与任务链相关路由契约实现"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status, Query, Body, HTTPException

from app.api.deps import get_task_use_cases
from app.domain.project.entities import TaskStatus
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

# 定义任务相关路由 (前缀为 /api/tasks)
tasks_router = APIRouter(prefix="/api/tasks", tags=["tasks"])

# 定义任务链相关路由 (前缀为 /api/task-chains)
task_chains_router = APIRouter(prefix="/api/task-chains", tags=["task-chains"])


# ==================== Task Chains 路由 ====================

@task_chains_router.post(
    "",
    response_model=TaskChainVO,
    status_code=status.HTTP_201_CREATED,
    summary="创建中观任务链",
    description="在指定项目下手动或通过 Agent 创建新的中观任务链容器"
)
async def create_task_chain(
    dto: CreateTaskChainDTO,
    use_cases: dict = Depends(get_task_use_cases)
):
    manage_uc = use_cases["manage_tree_use_case"]
    try:
        return await manage_uc.create_chain(dto)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@task_chains_router.post(
    "/{id}/recalculate-progress",
    response_model=ProcessedProgressDTO,
    summary="手动触发刷新校准任务链进度",
    description="强行校准或显式重算指定任务链及其归属项目的完成百分比进度"
)
async def recalculate_progress(
    id: str,
    use_cases: dict = Depends(get_task_use_cases)
):
    progress_uc = use_cases["progress_use_case"]
    try:
        return await progress_uc.manual_recalculate_progress(id)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ==================== Tasks 路由 ====================

@tasks_router.post(
    "",
    response_model=TaskVO,
    status_code=status.HTTP_201_CREATED,
    summary="创建微观原子任务",
    description="在任务链下创建具体的微观 Task，支持指定前置依赖任务 ID"
)
async def create_task(
    dto: CreateTaskDTO,
    use_cases: dict = Depends(get_task_use_cases)
):
    manage_uc = use_cases["manage_tree_use_case"]
    try:
        return await manage_uc.create_task(dto)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@tasks_router.patch(
    "/{id}/status",
    response_model=TaskStatusUpdateResponse,
    summary="更新原子任务状态",
    description="修改微观 Task 的状态，并在后端原子化触发 DAG 依赖解算与 TaskChain / Project 进度推导重算"
)
async def update_task_status(
    id: str,
    dto: UpdateTaskStatusDTO,
    use_cases: dict = Depends(get_task_use_cases)
):
    change_status_uc = use_cases["change_status_use_case"]
    try:
        return await change_status_uc.execute(id, dto)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        # 处理可能的防阻断矩阵错误等
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@tasks_router.get(
    "/{id}/notes",
    response_model=List[MaterialNoteVO],
    summary="查看 Task 挂载的素材笔记列表",
    description="在 Task 卡片详情中展开查看该任务绑定的所有思考感悟与素材笔记卡片列表"
)
async def list_notes(
    id: str,
    use_cases: dict = Depends(get_task_use_cases)
):
    note_attach_uc = use_cases["note_attachment_use_case"]
    try:
        return await note_attach_uc.list_notes(id)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@tasks_router.post(
    "/{id}/notes",
    response_model=AttachNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Task 直接撰写笔记或绑定已有笔记",
    description="在 Task 详情卡片中直接撰写并记录思考感悟笔记，或关联绑定素材库中已有的笔记"
)
async def attach_note(
    id: str,
    dto: CreateOrAttachTaskNoteDTO,
    use_cases: dict = Depends(get_task_use_cases)
):
    note_attach_uc = use_cases["note_attachment_use_case"]
    try:
        return await note_attach_uc.attach_or_create(id, dto)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@tasks_router.delete(
    "/{id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="解绑 Task 与素材笔记关联",
    description="从 Task 详情卡片中解除特定素材笔记的关联关系"
)
async def detach_note(
    id: str,
    note_id: str,
    use_cases: dict = Depends(get_task_use_cases)
):
    note_attach_uc = use_cases["note_attachment_use_case"]
    try:
        await note_attach_uc.detach(id, note_id)
        return
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
