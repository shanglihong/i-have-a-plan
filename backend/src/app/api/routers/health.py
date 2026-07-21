"""
接入层 - 健康检查路由 (Hello World 验证端点)

GET /api/health
  - 验证 FastAPI 应用正常启动
  - 验证数据库连接可用
  - 返回版本信息

此路由是工程骨架的运行验证基准。
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_db_session

router = APIRouter()


@router.get("/health", tags=["system"])
async def health_check(
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    """
    系统健康检查

    Returns:
        status: "ok" 表示服务正常
        version: 当前后端版本
        db: "connected" 表示数据库连接正常
    """
    # 执行简单 SQL 验证数据库连通性
    try:
        await session.exec(__import__("sqlmodel").select(__import__("sqlmodel").text("1")))  # type: ignore
        db_status = "connected"
    except Exception:
        db_status = "error"

    return {
        "status": "ok",
        "version": "0.1.0",
        "db": db_status,
    }
