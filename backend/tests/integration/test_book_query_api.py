"""Book 领域 3 个查询接口集成测试"""

import json
import os
import tempfile
import pytest
from app.infrastructure.db.models.book import BookDO


@pytest.fixture
def sample_book_do():
    return BookDO(
        id="bk_api_test_01",
        project_id="proj_test_01",
        file_name="乡土中国",
        file_type="EPUB",
        file_size=204850,
        storage_path="/tmp/test_book.epub",
        content_json_path="",
        parsing_status="COMPLETED",
        parsed_structure=[
            {
                "id": "toc_01",
                "title": "第一章 乡土本色",
                "level": 1,
                "target_chapter_id": "chap_01",
                "target_block_id": "b_01_001",
                "children": []
            }
        ],
        total_chapters=1,
        total_word_count=5000
    )


@pytest.mark.asyncio
async def test_get_book_metadata_api_success(client, test_session, sample_book_do):
    test_session.add(sample_book_do)
    await test_session.commit()

    response = await client.get("/api/books/bk_api_test_01")
    assert response.status_code == 200

    res_json = response.json()
    assert res_json["code"] == 200
    assert res_json["message"] == "success"

    data = res_json["data"]
    assert data["id"] == "bk_api_test_01"
    assert data["file_name"] == "乡土中国"
    assert data["file_type"] == "EPUB"
    assert data["parsing_status"] == "COMPLETED"
    assert data["total_chapters"] == 1


@pytest.mark.asyncio
async def test_get_book_metadata_api_not_found(client):
    response = await client.get("/api/books/bk_not_exist_404")
    assert response.status_code == 404
    res_json = response.json()
    assert res_json["detail"]["code"] == 404


@pytest.mark.asyncio
async def test_get_book_toc_api_success(client, test_session, sample_book_do):
    test_session.add(sample_book_do)
    await test_session.commit()

    response = await client.get("/api/books/bk_api_test_01/toc")
    assert response.status_code == 200

    res_json = response.json()
    assert res_json["code"] == 200

    data = res_json["data"]
    assert data["book_id"] == "bk_api_test_01"
    assert len(data["toc_tree"]) == 1
    assert data["toc_tree"][0]["title"] == "第一章 乡土本色"


@pytest.mark.asyncio
async def test_get_chapter_content_api_success(client, test_session, sample_book_do):
    with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".json") as f:
        content_data = {
            "chap_01": [
                {
                    "block_id": "b_01_001",
                    "block_type": "HEADING",
                    "sequence_index": 0,
                    "text": "第一章 乡土本色"
                },
                {
                    "block_id": "b_01_002",
                    "block_type": "PARAGRAPH",
                    "sequence_index": 1,
                    "text": "从基层上看去，中国社会是乡土性的。"
                }
            ]
        }
        json.dump(content_data, f, ensure_ascii=False)
        temp_json_path = f.name

    try:
        sample_book_do.content_json_path = temp_json_path
        test_session.add(sample_book_do)
        await test_session.commit()

        response = await client.get("/api/books/bk_api_test_01/chapters/chap_01?offset=0&limit=10")
        assert response.status_code == 200

        res_json = response.json()
        assert res_json["code"] == 200

        data = res_json["data"]
        assert data["book_id"] == "bk_api_test_01"
        assert data["chapter_id"] == "chap_01"
        assert data["total_blocks"] == 2
        assert data["has_more"] is False
        assert len(data["blocks"]) == 2
        assert data["blocks"][0]["block_id"] == "b_01_001"
        assert data["blocks"][1]["text"] == "从基层上看去，中国社会是乡土性的。"

    finally:
        if os.path.exists(temp_json_path):
            os.remove(temp_json_path)


@pytest.mark.asyncio
async def test_get_chapter_content_api_chapter_not_found(client, test_session, sample_book_do):
    with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".json") as f:
        json.dump({"chap_01": []}, f)
        temp_json_path = f.name

    try:
        sample_book_do.content_json_path = temp_json_path
        test_session.add(sample_book_do)
        await test_session.commit()

        response = await client.get("/api/books/bk_api_test_01/chapters/chap_invalid")
        assert response.status_code == 404
        res_json = response.json()
        assert res_json["detail"]["code"] == 404
    finally:
        if os.path.exists(temp_json_path):
            os.remove(temp_json_path)


@pytest.mark.asyncio
async def test_create_book_api_success(client):
    payload = {
        "project_id": "proj_create_01",
        "file_name": "高等数学",
        "file_type": "PDF",
        "file_size": 500000,
        "storage_path": "sandbox/books/bk_01/raw.pdf"
    }
    response = await client.post("/api/books", json=payload)
    assert response.status_code == 201

    res_json = response.json()
    assert res_json["code"] == 201
    data = res_json["data"]
    assert data["project_id"] == "proj_create_01"
    assert data["file_name"] == "高等数学"
    assert data["file_type"] == "PDF"
    assert data["parsing_status"] == "PENDING"

