"""
接入层 - 项目路由

覆盖 API 规范 2.1：项目与生命周期
  - POST   /api/projects        创建项目
  - GET    /api/projects        获取项目列表（Offset 分页）
  - GET    /api/projects/{id}   获取单个项目
  - POST   /api/projects/{id}/archive  归档
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import ProjectUseCasesDep
from app.domain.project.entities import Project

router = APIRouter(prefix="/projects", tags=["projects"])


# ---------------------------------------------------------------------------
# 请求/响应 Schema
# ---------------------------------------------------------------------------


class CreateProjectRequest(BaseModel):
    title: str
    type: str  # "READING" | "PLAN"
    deadline: Optional[datetime] = None


class ProjectListResponse(BaseModel):
    items: list[Project]
    total: int
    page: int
    size: int
    has_next: bool


# ---------------------------------------------------------------------------
# 路由定义
# ---------------------------------------------------------------------------


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: CreateProjectRequest,
    use_cases: ProjectUseCasesDep,
) -> Project:
    """创建双轨项目（READING 或 PLAN 类型）"""
    from app.application.use_cases.project_use_cases import CreateProjectInput

    input_data = CreateProjectInput(
        title=body.title,
        type=body.type,
        deadline=body.deadline,
    )
    return await use_cases.create_project(input_data)


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    use_cases: ProjectUseCasesDep,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
) -> ProjectListResponse:
    """分页获取项目列表（Offset 分页）"""
    items, total = await use_cases.list_projects(page=page, size=size)
    return ProjectListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        has_next=(page * size) < total,
    )


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    use_cases: ProjectUseCasesDep,
) -> Project:
    """获取单个项目"""
    project = await use_cases.get_project(project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"项目不存在: {project_id}",
        )
    return project


@router.post("/{project_id}/archive", response_model=Project)
async def archive_project(
    project_id: str,
    use_cases: ProjectUseCasesDep,
) -> Project:
    """归档项目"""
    try:
        return await use_cases.archive_project(project_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
