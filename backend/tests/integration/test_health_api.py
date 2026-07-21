"""
集成测试 - 健康检查 API

验证整个通路：FastAPI 路由 -> Depends 注入 -> 数据库连接 -> 响应。
使用内存 SQLite，不依赖真实数据库。
"""
from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(client) -> None:
    """GET /api/health 应返回 200 且 status 为 ok"""
    response = await client.get("/api/health")

    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "0.1.0"
    assert "db" in body


@pytest.mark.asyncio
async def test_health_db_connected(client) -> None:
    """健康检查应报告数据库连接正常"""
    response = await client.get("/api/health")
    body = response.json()

    assert body["db"] == "connected"
