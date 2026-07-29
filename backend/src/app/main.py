"""FastAPI 应用入口"""

from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.infrastructure.db.session import init_db
from app.api.routers.book import router as book_router
from app.api.routers.project import router as project_router
from app.api.routers.health import router as health_router
from app.api.routers.tasks import tasks_router, task_chains_router
from app.api.routers.notes import router as notes_router
from app.api.error_handler import register_error_handlers


from app.consumers import register_consumers
from app.application.health import StartupHealingUseCase


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动钩子：初始化数据库表结构与事件消费者，并触发系统冷启动自愈
    await init_db()
    register_consumers()
    await StartupHealingUseCase().execute()
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

    # 注册全局异常处理器
    register_error_handlers(app)

    # 挂载 Book、Project 与 Health 领域路由
    app.include_router(health_router, prefix="/api")
    app.include_router(book_router)
    app.include_router(project_router)
    app.include_router(tasks_router)
    app.include_router(task_chains_router)
    app.include_router(notes_router)

    return app


app = create_app()

