from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, Request, status, Query, Body

from app.domain.base import SortOrder
from app.domain.project.entities import ProjectSortBy
from app.api.deps import get_project_use_cases
from app.application.project.dtos import (
    CreatePlanProjectDTO,
    UpdateProjectDTO,
    CreateExperienceNoteDTO,
    ProjectResponseDTO,
    ProjectListResponseDTO,
    ProjectDetailDTO,
    ExperienceNoteResponseDTO,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post(
    "",
    response_model=ProjectResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="创建双轨项目",
    description="创建阅读项目 (Form-Data 上传文件) 或计划项目 (JSON Payload)",
)
async def create_project(
    request: Request,
    use_cases: dict = Depends(get_project_use_cases),
):
    create_uc = use_cases["create_use_case"]
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        title = str(form.get("title", ""))
        deadline_str = form.get("deadline")
        file_obj = form.get("file")

        deadline = None
        if deadline_str and isinstance(deadline_str, str):
            try:
                deadline = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
            except ValueError:
                pass

        upload_file: Optional[UploadFile] = file_obj if (file_obj and hasattr(file_obj, "read")) else None
        return await create_uc.create_reading_project(
            title=title,
            deadline=deadline,
            file=upload_file,
        )

    else:
        body = await request.json()
        dto = CreatePlanProjectDTO(**body)
        return await create_uc.create_plan_project(dto)


@router.get(
    "",
    response_model=ProjectListResponseDTO,
    summary="获取项目列表",
    description="获取当前用户的项目列表，支持基于状态与类型进行过滤与分页",
)
async def list_projects(
    status_filter: Optional[str] = Query(None, alias="status", description="状态过滤 INIT/ACTIVE/ARCHIVED"),
    type_filter: Optional[str] = Query(None, alias="type", description="项目类型过滤 READING/PLAN"),
    sort_by: ProjectSortBy = Query(ProjectSortBy.UPDATED_AT, description="排序字段"),
    order: SortOrder = Query(SortOrder.DESC, description="排序方向 asc/desc"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页条数"),
    use_cases: dict = Depends(get_project_use_cases),
):
    query_uc = use_cases["query_use_case"]
    return await query_uc.list_projects(
        status_filter=status_filter,
        type_filter=type_filter,
        sort_by=sort_by,
        order=order,
        page=page,
        size=size,
    )


@router.get(
    "/{id}/detail",
    response_model=ProjectDetailDTO,
    summary="获取项目详情与任务树",
    description="获取单个项目的完整聚合数据及三层任务树结构",
)
async def get_project_detail(
    id: str,
    use_cases: dict = Depends(get_project_use_cases),
):
    query_uc = use_cases["query_use_case"]
    return await query_uc.get_project_detail(id)


@router.patch(
    "/{id}",
    response_model=ProjectResponseDTO,
    summary="更新项目元数据",
    description="更新项目的名称、截止时间等元数据",
)
async def update_project(
    id: str,
    dto: UpdateProjectDTO,
    use_cases: dict = Depends(get_project_use_cases),
):
    manage_uc = use_cases["manage_state_use_case"]
    return await manage_uc.update_project_metadata(id, dto)


@router.post(
    "/{id}/archive",
    response_model=ProjectResponseDTO,
    summary="项目归档",
    description="将已完成或终止的项目置为 ARCHIVED 状态",
)
async def archive_project(
    id: str,
    use_cases: dict = Depends(get_project_use_cases),
):
    manage_uc = use_cases["manage_state_use_case"]
    return await manage_uc.archive_project(id)


@router.post(
    "/{id}/experience-note",
    response_model=ExperienceNoteResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="生成归档经验笔记",
    description="当用户在归档卡片点击【生成经验笔记】时调用",
)
async def create_experience_note(
    id: str,
    dto: CreateExperienceNoteDTO = Body(default_factory=CreateExperienceNoteDTO),
    use_cases: dict = Depends(get_project_use_cases),
):
    note_uc = use_cases["create_note_use_case"]
    return await note_uc.create_experience_note(id, dto)


@router.post(
    "/{id}/reactivate",
    response_model=ProjectResponseDTO,
    summary="重激活项目",
    description="将已归档的项目重新恢复为 ACTIVE 状态",
)
async def reactivate_project(
    id: str,
    use_cases: dict = Depends(get_project_use_cases),
):
    manage_uc = use_cases["manage_state_use_case"]
    return await manage_uc.reactivate_project(id)


@router.post(
    "/{id}/complete-plan-tree",
    response_model=ProjectResponseDTO,
    summary="对话完成自动挂载任务树",
    description="Agent 工作台对话完成后挂载生成的任务树并激活项目为 ACTIVE",
)
async def complete_plan_tree(
    id: str,
    chains: list = Body(...),
    use_cases: dict = Depends(get_project_use_cases),
):
    complete_uc = use_cases["complete_tree_use_case"]
    return await complete_uc.complete_tree(id, chains)

