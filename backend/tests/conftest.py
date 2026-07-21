"""
pytest 全局 Fixtures

提供测试专用的隔离环境：
  - 内存 SQLite 引擎（每个测试用例独立，互不干扰）
  - 重写 FastAPI Depends，注入内存 Session
  - 提供 AsyncClient 用于集成测试
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.main import create_app


@pytest_asyncio.fixture
async def test_engine():
    """内存 SQLite 引擎（每个测试独立）"""
    # 导入所有实体，确保元数据注册
    from app.domain.graph.entities import GraphEdge, GraphNode, TagSuperNode  # noqa
    from app.domain.note.entities import ExperienceNote, UnifiedReadingNote  # noqa
    from app.domain.project.entities import Project, Task  # noqa
    from app.domain.skill.entities import Skill, SkillStep  # noqa

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True,
    )
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_session(test_engine):
    """测试专用 AsyncSession"""
    async with AsyncSession(test_engine, expire_on_commit=False) as session:
        yield session


@pytest_asyncio.fixture
async def client(test_session):
    """
    AsyncClient - 用于 API 集成测试

    通过 dependency_overrides 将数据库 Session 替换为内存测试 Session，
    完全隔离，不影响真实数据库。
    """
    from app.api.deps import get_db_session

    app = create_app()

    async def override_get_session():
        yield test_session

    app.dependency_overrides[get_db_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
