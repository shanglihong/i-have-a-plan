"""数据库引擎与异步 Session 管理"""

from app.utils.path import get_db_dir
import os
from pathlib import Path
from typing import AsyncGenerator
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker


def get_database_path() -> Path:
    """获取 SQLite 数据库物理文件绝对路径"""
    return get_db_dir() / "app.db"


def get_database_url() -> str:
    """获取数据库连接 URL"""
    return os.getenv("DATABASE_URL") or f"sqlite+aiosqlite:///{get_database_path()}"


DATABASE_URL = get_database_url()

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """初始化底层数据库表结构"""
    get_database_path().parent.mkdir(parents=True, exist_ok=True)

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)  # 扫描所有 ORM 模型触发 DDL


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI 依赖注入 Session"""
    async with async_session_factory() as session:
        yield session
