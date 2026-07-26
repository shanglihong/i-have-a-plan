"""
接入层 - FastAPI 依赖注入定义 (Depends)

集中管理所有 FastAPI Depends 函数，委派全局 AppContainer (Composition Root) 组装依赖。
测试时通过 app.dependency_overrides 替换 Mock 实现。
"""
from __future__ import annotations

from typing import Annotated, AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.session import get_async_session
from app.container import AppContainer


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """提供数据库 Session, 每次请求独立"""
    async for session in get_async_session():
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_db_session)]


async def get_book_use_cases(session: AsyncSession = Depends(get_async_session)) -> dict:
    """由 AppContainer 统一构建与提供 Book 领域用例组依赖"""
    container = AppContainer(session)
    return container.get_book_use_cases()


async def get_project_use_cases(session: AsyncSession = Depends(get_async_session)) -> dict:
    """由 AppContainer 统一构建与提供 Project 领域用例组依赖"""
    container = AppContainer(session)
    return container.get_project_use_cases()
