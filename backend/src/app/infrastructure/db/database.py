"""
基础设施层 - SQLite 引擎初始化与 Session 管理

职责：
  - 初始化 SQLModel 引擎（指向 Local-First 数据库路径）
  - 在应用启动时执行建表（手写 DDL + SQLModel metadata）
  - 提供 FastAPI Depends 可用的 Session 生成器

数据库路径优先级：
  1. 环境变量 DATABASE_URL
  2. 默认 ~/.i-have-a-plan/data.db（遵循 Local-First 设计）
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession


def _resolve_db_path() -> str:
    """解析数据库路径，优先读取环境变量"""
    env_url = os.environ.get("DATABASE_URL")
    if env_url:
        return env_url

    default_dir = Path.home() / ".i-have-a-plan"
    default_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite+aiosqlite:///{default_dir / 'data.db'}"


DATABASE_URL: str = _resolve_db_path()

# 全局异步引擎（单例）
_engine: AsyncEngine | None = None


def get_engine() -> AsyncEngine:
    """获取（懒初始化）全局异步引擎"""
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            DATABASE_URL,
            echo=os.environ.get("SQL_ECHO", "false").lower() == "true",
            future=True,
        )
    return _engine


async def init_db() -> None:
    """
    应用启动时调用，创建所有 SQLModel 表。
    使用 SQLModel.metadata.create_all 而非 Alembic，遵循手写 DDL 约定。
    """
    engine = get_engine()
    # 确保所有实体模块已被导入，SQLModel 才能注册元数据
    from app.domain.graph.entities import GraphEdge, GraphNode, TagSuperNode  # noqa: F401
    from app.domain.note.entities import ExperienceNote, UnifiedReadingNote  # noqa: F401
    from app.domain.project.entities import Project, Task  # noqa: F401
    from app.domain.skill.entities import Skill, SkillStep  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI Depends 依赖生成器。
    每个请求创建独立 Session，请求结束自动关闭。
    """
    async with AsyncSession(get_engine(), expire_on_commit=False) as session:
        yield session
