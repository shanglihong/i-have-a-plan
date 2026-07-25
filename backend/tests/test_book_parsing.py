"""电子书解析功能与 DDD 充血模型测试 (Book Parsing & DDD Test Suite)"""

import os
import shutil
import tempfile
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.domain.book.entities import (
    Book, BookFileType, ParsingStatus, HealingStatus, TocNode, ContentBlock
)
from app.domain.book.exceptions import InvalidStateTransitionException, BookNotFoundException
from app.domain.book.strategies import TxtParserStrategy, MdParserStrategy
from app.infrastructure.file_storage.book_storage import LocalBookFileStorageAdapter


@pytest.fixture
def temp_sandbox_dir():
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d, ignore_errors=True)


def test_ddd_book_aggregate_root_state_machine():
    """测试 Book 聚合根充血模型的行为与防阻断状态机转换"""
    book = Book(id="bk_ddd_01", project_id="proj_ddd")
    assert book.parsing_status == ParsingStatus.PENDING
    assert not book.is_completed()

    # 1. 合法转换 PENDING -> PARSING
    book.start_parsing()
    assert book.parsing_status == ParsingStatus.PARSING
    assert book.is_parsing()

    # 2. 合法转换 PARSING -> COMPLETED
    toc = [TocNode(id="t1", title="第一章", target_chapter_id="chap_01")]
    book.complete_parsing(toc_tree=toc, total_chapters=1, total_word_count=100, content_json_path="/tmp/c.json")
    assert book.parsing_status == ParsingStatus.COMPLETED
    assert book.is_completed()
    assert book.total_chapters == 1

    # 3. 非法转换 COMPLETED -> PARSING 必须拦截抛出 InvalidStateTransitionException
    with pytest.raises(InvalidStateTransitionException) as exc_info:
        book.start_parsing()
    assert "不允许的状态转移" in str(exc_info.value)


def test_ddd_value_object_immutability():
    """测试 TocNode 与 ContentBlock 值对象的不可变语义 (frozen=True)"""
    node = TocNode(id="t1", title="测试节点", level=1)
    with pytest.raises((AttributeError, Exception)):
        node.title = "已修改节点"  # frozen 导致无法直接修改

    block = ContentBlock(block_id="b1", text="物理段落")
    with pytest.raises((AttributeError, Exception)):
        block.text = "新段落"


@pytest.mark.asyncio
async def test_txt_parser_strategy(temp_sandbox_dir):
    sample_txt = os.path.join(temp_sandbox_dir, "sample.txt")
    with open(sample_txt, "w", encoding="utf-8") as f:
        f.write("第一章 基础概念\n这是第一章的第一段文本。\n这是第一章的第二段文本。\n\n第二章 进阶实战\n这是第二章的内容。")

    parser = TxtParserStrategy()
    toc, chapter_blocks = parser.parse(sample_txt)

    assert len(toc) == 2
    assert toc[0].title == "第一章 基础概念"
    assert toc[1].title == "第二章 进阶实战"
    assert "chap_01" in chapter_blocks
    assert "chap_02" in chapter_blocks


@pytest.mark.asyncio
async def test_md_parser_strategy(temp_sandbox_dir):
    sample_md = os.path.join(temp_sandbox_dir, "sample.md")
    with open(sample_md, "w", encoding="utf-8") as f:
        f.write("# 导论\n这是导论正文。\n\n## 1.1 背景\n背景介绍。\n\n```python\nprint('hello')\n```\n\n> 提示引用")

    parser = MdParserStrategy()
    toc, chapter_blocks = parser.parse(sample_md)

    assert len(toc) >= 1
    all_blocks = []
    for blocks in chapter_blocks.values():
        all_blocks.extend(blocks)

    block_types = [b.block_type for b in all_blocks]
    assert "HEADING" in block_types
    assert "PARAGRAPH" in block_types


@pytest.mark.asyncio
async def test_atomic_file_storage(temp_sandbox_dir):
    storage = LocalBookFileStorageAdapter(base_dir=temp_sandbox_dir)
    test_data = {
        "chap_01": [
            {"block_id": "b_01", "text": "测试段落", "block_type": "PARAGRAPH", "sequence_index": 1}
        ]
    }

    raw_path = os.path.join(temp_sandbox_dir, "bk_test_01", "raw.txt")
    path = await storage.save_parsed_content_json(raw_path, test_data)
    assert os.path.exists(path)
    assert path.endswith("parsed_content.json")

    tmp_path = path + ".tmp"
    assert not os.path.exists(tmp_path)

    blocks = await storage.read_chapter_blocks(path, "chap_01")
    assert len(blocks) == 1
    assert blocks[0]["text"] == "测试段落"


@pytest.mark.asyncio
async def test_book_rest_api_workflow(temp_sandbox_dir):
    from app.infrastructure.db.session import init_db
    await init_db()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        sample_txt_path = os.path.join(temp_sandbox_dir, "api_test.txt")
        with open(sample_txt_path, "w", encoding="utf-8") as f:
            f.write("第一章 API测试\n这是通过 API 上传解析的段落文本。")

        # 1. 初始化创建 Book 实体
        create_payload = {
            "project_id": "proj_unit_test",
            "file_name": "api_test.txt",
            "file_type": "TXT",
            "file_size": os.path.getsize(sample_txt_path),
            "storage_path": sample_txt_path
        }
        create_res = await ac.post("/api/books", json=create_payload)
        assert create_res.status_code == 201
        book_id = create_res.json()["data"]["id"]

        # 2. 触发解析
        response = await ac.post("/api/books/parse-file", data={"book_id": book_id})
        assert response.status_code == 200
        res_json = response.json()
        assert res_json["code"] == 200
        book_data = res_json["data"]
        assert book_data["id"] == book_id
        assert book_data["parsing_status"] == "COMPLETED"


        # 2. 查询 Book 元数据
        meta_res = await ac.get(f"/api/books/{book_id}")
        assert meta_res.status_code == 200
        assert meta_res.json()["data"]["id"] == book_id

        # 3. 查询 Toc 树
        toc_res = await ac.get(f"/api/books/{book_id}/toc")
        assert toc_res.status_code == 200
        toc_tree = toc_res.json()["data"]["toc_tree"]
        assert len(toc_tree) == 1
        target_chap_id = toc_tree[0]["target_chapter_id"]

        # 4. 懒加载章节切片
        content_res = await ac.get(f"/api/books/{book_id}/chapters/{target_chap_id}?offset=0&limit=10")
        assert content_res.status_code == 200
        chapter_data = content_res.json()["data"]
        assert chapter_data["total_blocks"] == 2

        # 5. 沙箱自愈校验
        verify_res = await ac.post(f"/api/books/{book_id}/verify")
        assert verify_res.status_code == 200
        assert verify_res.json()["data"]["status"] == HealingStatus.INTACT


@pytest.mark.asyncio
async def test_healing_service_returns_enum():
    """测试 BookHealingDomainService 返回 HealingStatus 枚举"""
    from unittest.mock import AsyncMock
    repo = AsyncMock()
    file_storage = AsyncMock()
    parsing_engine = AsyncMock()

    from app.domain.book.services import BookHealingDomainService
    service = BookHealingDomainService(repo, file_storage, parsing_engine)

    # 1. 找不到书籍
    repo.find_by_id.return_value = None
    status, book = await service.verify_and_heal_book("non_existent")
    assert status == HealingStatus.NOT_FOUND
    assert status == "NOT_FOUND"
    assert book is None


def test_database_workspace_configuration(monkeypatch, temp_sandbox_dir):
    """测试基于 WORKSPACE_DIR 的动态数据库 URL 拼装逻辑"""
    from app.infrastructure.db.session import get_workspace_dir, get_database_url

    # 1. 默认逻辑
    monkeypatch.delenv("WORKSPACE_DIR", raising=False)
    monkeypatch.delenv("WORKSPACE_PATH", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)

    default_url = get_database_url()
    assert "db/app.db" in default_url

    # 2. 自定义 WORKSPACE_DIR 环境变量
    monkeypatch.setenv("WORKSPACE_DIR", temp_sandbox_dir)
    custom_url = get_database_url()
    assert temp_sandbox_dir in custom_url

    # 3. 自定义 WORKSPACE_DIR 带 ~ 波浪号路径展开
    monkeypatch.setenv("WORKSPACE_DIR", "~/i_have_a_plan_test")
    tilde_url = get_database_url()
    assert "~" not in tilde_url
    assert "i_have_a_plan_test/db/app.db" in tilde_url



