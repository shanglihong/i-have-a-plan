"""
接入层 - FastAPI 依赖注入定义 (Depends)

集中管理所有 FastAPI Depends 函数，避免路由文件直接耦合基础设施层。
路由文件只需 from app.api.deps import get_project_use_cases 即可使用。

测试时通过 app.dependency_overrides 替换 Mock 实现。
"""
from __future__ import annotations

from typing import Annotated, AsyncGenerator

from fastapi import Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.application.use_cases.project_use_cases import ProjectUseCases
from app.infrastructure.db.database import get_session
from app.infrastructure.db.repositories.project_repository import SqliteProjectRepository


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """提供数据库 Session（每次请求独立）"""
    async for session in get_session():
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_db_session)]


async def get_project_repository(
    session: SessionDep,
) -> SqliteProjectRepository:
    """提供项目仓储实例（注入当前 Session）"""
    return SqliteProjectRepository(session=session)


ProjectRepoDep = Annotated[SqliteProjectRepository, Depends(get_project_repository)]


async def get_project_use_cases(
    repo: ProjectRepoDep,
) -> ProjectUseCases:
    """提供项目用例实例（组合注入仓储）"""
    return ProjectUseCases(project_repo=repo)


ProjectUseCasesDep = Annotated[ProjectUseCases, Depends(get_project_use_cases)]
