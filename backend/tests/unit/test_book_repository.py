"""BookRepository 字段反序列化解析及容错测试"""

import pytest
import json
from app.domain.book.entities import Book, BookFileType, ParsingStatus
from app.infrastructure.db.session import init_db, get_async_session
from app.infrastructure.db.models.book import BookDO
from app.infrastructure.db.repositories.book_repository import BookRepositoryAdapter


@pytest.mark.asyncio
async def test_book_repository_parsed_structure_parsing() -> None:
    await init_db()
    async for session in get_async_session():
        repo = BookRepositoryAdapter(session)

        # 1. 测试正常列表情况
        do_list = BookDO(
            id="bk_test_01",
            project_id="proj_test",
            file_name="测试1",
            file_type="TXT",
            file_size=100,
            storage_path="path",
            content_json_path="json_path",
            parsing_status="PENDING",
            parsed_structure=[{"id": "c1", "title": "章1"}],
            total_chapters=0,
            total_word_count=0
        )
        book1 = repo._to_domain(do_list)
        assert isinstance(book1.parsed_structure, list)
        assert len(book1.parsed_structure) == 1
        assert book1.parsed_structure[0]["title"] == "章1"

        # 2. 测试 JSON 字符串格式的情况
        do_str = BookDO(
            id="bk_test_02",
            project_id="proj_test",
            file_name="测试2",
            file_type="TXT",
            file_size=100,
            storage_path="path",
            content_json_path="json_path",
            parsing_status="PENDING",
            parsed_structure=json.dumps([{"id": "c2", "title": "章2"}]),
            total_chapters=0,
            total_word_count=0
        )
        book2 = repo._to_domain(do_str)
        assert isinstance(book2.parsed_structure, list)
        assert len(book2.parsed_structure) == 1
        assert book2.parsed_structure[0]["title"] == "章2"

        # 3. 测试畸形 JSON 字符串情况（应当容错返回空列表）
        do_invalid_str = BookDO(
            id="bk_test_03",
            project_id="proj_test",
            file_name="测试3",
            file_type="TXT",
            file_size=100,
            storage_path="path",
            content_json_path="json_path",
            parsing_status="PENDING",
            parsed_structure="{invalid_json_string",
            total_chapters=0,
            total_word_count=0
        )
        book3 = repo._to_domain(do_invalid_str)
        assert isinstance(book3.parsed_structure, list)
        assert len(book3.parsed_structure) == 0

        # 4. 测试 None 值情况
        do_none = BookDO(
            id="bk_test_04",
            project_id="proj_test",
            file_name="测试4",
            file_type="TXT",
            file_size=100,
            storage_path="path",
            content_json_path="json_path",
            parsing_status="PENDING",
            parsed_structure=None,
            total_chapters=0,
            total_word_count=0
        )
        book4 = repo._to_domain(do_none)
        assert isinstance(book4.parsed_structure, list)
        assert len(book4.parsed_structure) == 0
        break
