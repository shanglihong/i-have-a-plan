"""笔记领域 REST API 端端集成测试"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_note_api_lifecycle(client: AsyncClient) -> None:
    """测试素材笔记与沉淀笔记的完整 REST API 生命周期"""
    # 1. 准备前置项目与任务数据
    # 1.1 创建计划项目
    project_res = await client.post("/api/projects", json={
        "title": "集成测试项目",
        "type": "PLAN",
        "deadline": "2026-12-31T23:59:59Z"
    })
    assert project_res.status_code == 201
    project_id = project_res.json()["id"]

    # 1.2 创建任务链
    chain_res = await client.post("/api/task-chains", json={
        "project_id": project_id,
        "title": "集成测试里程碑",
        "type": "PLAN_STAGE",
        "sequence_order": 1
    })
    assert chain_res.status_code == 201
    chain_id = chain_res.json()["id"]

    # 1.3 创建任务
    task_res = await client.post("/api/tasks", json={
        "task_chain_id": chain_id,
        "title": "做架构设计",
        "sequence_order": 1
    })
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # 2. 测试素材笔记接口
    # 2.1 创建素材笔记
    material_payload = {
        "project_id": project_id,
        "task_id": task_id,
        "source_type": "USER_THOUGHT",
        "raw_quote": "软件开发的核心是化繁为简",
        "user_interpretation": "需要遵循 KISS 原则",
        "context_reflection": "在我的项目中应该时刻注意",
        "tags": ["KISS", "DDD"]
    }
    create_mat_res = await client.post("/api/notes/material", json=material_payload)
    assert create_mat_res.status_code == 201, create_mat_res.json()
    mat_data = create_mat_res.json()["data"]
    assert mat_data["id"].startswith("mat_")
    assert mat_data["user_interpretation"] == "需要遵循 KISS 原则"
    material_note_id = mat_data["id"]

    # 2.2 查询素材笔记列表
    list_mat_res = await client.get(f"/api/notes/material?project_id={project_id}&limit=10")
    assert list_mat_res.status_code == 200
    list_data = list_mat_res.json()["data"]
    assert len(list_data["items"]) >= 1
    assert list_data["items"][0]["id"] == material_note_id

    # 2.3 关键词检索
    search_mat_res = await client.get(f"/api/notes/material?keyword=KISS&limit=10")
    assert search_mat_res.status_code == 200
    assert len(search_mat_res.json()["data"]["items"]) >= 1

    # 3. 测试沉淀笔记接口
    # 3.1 提炼创建沉淀笔记
    synthesize_payload = {
        "project_id": project_id,
        "title": "项目架构KISS法则总结",
        "note_type": "GENERAL",
        "blocks": [
            {
                "block_type": "HEADING",
                "content": "KISS设计心得"
            },
            {
                "block_type": "PARAGRAPH",
                "content": "通过本次实战，我们体会到了极致简洁的魅力。"
            },
            {
                "block_type": "MATERIAL_REF",
                "material_note_id": material_note_id,
                "quote_snapshot": "软件开发的核心是化繁为简",
                "interpretation_snapshot": "需要遵循 KISS 原则"
            }
        ]
    }
    create_syn_res = await client.post("/api/notes/synthesize", json=synthesize_payload)
    assert create_syn_res.status_code == 201, create_syn_res.json()
    syn_data = create_syn_res.json()["data"]
    assert syn_data["id"].startswith("syn_")
    assert syn_data["referenced_material_count"] == 1
    syn_note_id = syn_data["id"]

    # 3.2 获取详情
    detail_res = await client.get(f"/api/notes/synthesize/{syn_note_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()["data"]
    assert detail_data["title"] == "项目架构KISS法则总结"
    assert len(detail_data["blocks"]) == 3
    assert detail_data["blocks"][2]["material_note_id"] == material_note_id

    # 3.3 更新沉淀笔记
    update_payload = {
        "title": "项目架构KISS法则与重构总结",
        "blocks": [
            {
                "block_type": "HEADING",
                "content": "KISS与持续重构"
            },
            {
                "block_type": "PARAGRAPH",
                "content": "补充更新：持续重构是维护KISS原则的唯一手段。"
            },
            {
                "block_type": "MATERIAL_REF",
                "material_note_id": material_note_id,
                "quote_snapshot": "软件开发的核心是化繁为简",
                "interpretation_snapshot": "需要遵循 KISS 原则"
            }
        ]
    }
    update_res = await client.put(f"/api/notes/synthesize/{syn_note_id}", json=update_payload)
    assert update_res.status_code == 200
    update_data = update_res.json()["data"]
    assert update_data["title"] == "项目架构KISS法则与重构总结"

    # 再次查详情校验更新
    detail_res2 = await client.get(f"/api/notes/synthesize/{syn_note_id}")
    assert detail_res2.status_code == 200
    assert detail_res2.json()["data"]["blocks"][0]["content"] == "KISS与持续重构"

    # 3.4 删除沉淀笔记
    del_res = await client.delete(f"/api/notes/synthesize/{syn_note_id}")
    assert del_res.status_code == 200
    assert del_res.json()["data"]["deleted"] is True

    # 删除后尝试获取，应返回 404
    after_del_res = await client.get(f"/api/notes/synthesize/{syn_note_id}")
    assert after_del_res.status_code == 404
