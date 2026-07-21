"""
FastAPI 应用入口

职责：
  - 创建 FastAPI 实例
  - 注册全局异常处理器
  - 挂载所有路由（统一 /api 前缀）
  - Lifespan 管理：启动时初始化 DB、启动 EventBus 守护任务
  - 生产模式下挂载前端静态文件 (dist/)
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.error_handler import register_error_handlers
from app.api.routers import dashboard, health, notes, projects, skills, tasks
from app.config import settings
from app.infrastructure.db.database import init_db
from app.infrastructure.event_bus.asyncio_event_bus import event_bus

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    应用生命周期管理（FastAPI Lifespan）

    启动：
      1. 初始化数据库（建表）
      2. 启动 EventBus 后台守护任务

    关闭：
      1. 优雅停止 EventBus
    """
    logger.info("应用启动中...")

    # 1. 初始化数据库
    await init_db()
    logger.info("数据库初始化完成: %s", settings.database_url or "默认路径")

    # 2. 启动 EventBus 后台任务
    bus_task = asyncio.create_task(event_bus.start())
    logger.info("EventBus 守护任务已启动")

    yield  # 应用运行期间

    # 关闭阶段
    await event_bus.stop()
    bus_task.cancel()
    logger.info("应用已优雅关闭")


def create_app() -> FastAPI:
    """工厂函数：创建并配置 FastAPI 应用实例"""
    app = FastAPI(
        title=settings.app_title,
        version=settings.app_version,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        lifespan=lifespan,
    )

    # CORS（开发阶段允许所有来源，生产时应收窄）
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.debug else ["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 全局异常处理器（RFC 7807）
    register_error_handlers(app)

    # 路由注册（统一 /api 前缀）
    app.include_router(health.router, prefix="/api")
    app.include_router(projects.router, prefix="/api")
    app.include_router(notes.router, prefix="/api")
    app.include_router(skills.router, prefix="/api")
    app.include_router(tasks.router, prefix="/api")
    app.include_router(dashboard.router, prefix="/api")

    # 生产模式：挂载前端静态文件（PyInstaller 打包时前端 dist/ 与后端同目录）
    frontend_dist = Path(__file__).parent.parent.parent.parent / "frontend" / "dist"
    if frontend_dist.exists():
        app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
        logger.info("前端静态文件已挂载: %s", frontend_dist)

    return app


# Uvicorn 入口
app = create_app()
