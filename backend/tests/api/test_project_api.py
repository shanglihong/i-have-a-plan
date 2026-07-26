"""Project 模块 REST API 集成测试"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.infrastructure.db.session import init_db


@pytest.mark.asyncio
async def test_create_plan_project() -> None:
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "title": "Linux 内核重构计划",
            "type": "PLAN",
            "deadline": "2026-12-31T23:59:59Z",
        }
        res = await client.post("/api/projects", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["title"] == "Linux 内核重构计划"
        assert data["type"] == "PLAN"
        assert data["status"] == "INIT"
        assert data["assigned_agent_id"] is not None
        assert data["assigned_agent_id"].startswith("agent_sup_")
        project_id = data["id"]

        # 测试列表查询
        list_res = await client.get("/api/projects")
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert list_data["total"] >= 1

        # 测试获取详情
        detail_res = await client.get(f"/api/projects/{project_id}/detail")
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["id"] == project_id

        # 测试更新元数据
        patch_res = await client.patch(
            f"/api/projects/{project_id}",
            json={"title": "Linux 内核重构计划 (精读版)"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["title"] == "Linux 内核重构计划 (精读版)"


@pytest.mark.asyncio
async def test_create_reading_project_form() -> None:
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        data = {
            "title": "设计模式之禅",
            "type": "READING",
        }
        res = await client.post("/api/projects", data=data)
        assert res.status_code == 201
        res_data = res.json()
        assert res_data["title"] == "设计模式之禅"
        assert res_data["type"] == "READING"
        assert res_data["status"] == "INIT"
        assert res_data["assigned_agent_id"] is not None
        assert res_data["assigned_agent_id"].startswith("agent_read_")


@pytest.mark.asyncio
async def test_create_reading_project_with_file_upload() -> None:
    import os
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        data = {
            "title": "DDD 领域驱动设计",
            "type": "READING",
        }
        files = {
            "file": ("ddd_sample.pdf", b"%PDF-1.4 test content", "application/pdf")
        }
        res = await client.post("/api/projects", data=data, files=files)
        assert res.status_code == 201
        res_data = res.json()
        assert res_data["title"] == "DDD 领域驱动设计"
        assert res_data["book_id"] is not None
        assert res_data["storage_path"] is not None
        assert "ddd_sample.pdf" in res_data["storage_path"]
        assert os.path.exists(res_data["storage_path"])




