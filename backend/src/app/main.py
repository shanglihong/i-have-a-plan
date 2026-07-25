"""FastAPI 应用入口"""

from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.infrastructure.db.session import init_db
from app.api.routers.book import router as book_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动钩子：初始化数据库表结构
    await init_db()
    yield
    # 关闭钩子


def create_app() -> FastAPI:
    """创建并配置 FastAPI 应用实例"""
    app = FastAPI(
        title="i-have-a-plan API",
        version="1.0.0",
        description="i-have-a-plan 后端系统 API",
        lifespan=lifespan
    )

    # 挂载 Book 领域路由
    app.include_router(book_router)

    return app


app = create_app()
