"""Book 领域 3 个查询 UseCases 及 Domain Services 单元测试"""

import pytest
from unittest.mock import AsyncMock

from app.domain.book.entities import Book, BookFileType, ParsingStatus
from app.domain.book.exceptions import (
    BookNotFoundException,
    BookParsingFailedException,
    ChapterNotFoundException
)
from app.domain.book.services import (
    BookTocQueryDomainService,
    BookChapterContentDomainService
)
from app.application.book.use_cases import (
    GetBookMetadataUseCase,
    GetBookTocUseCase,
    GetChapterContentUseCase
)


@pytest.fixture
def mock_repository():
    return AsyncMock()


@pytest.fixture
def mock_file_storage():
    return AsyncMock()


@pytest.mark.asyncio
async def test_get_book_metadata_success(mock_repository):
    dummy_book = Book(
        id="bk_test_01",
        project_id="proj_01",
        file_name="test.txt",
        file_type=BookFileType.TXT,
        file_size=1024,
        storage_path="/path/test.txt",
        content_json_path="/path/parsed_content.json",
        parsing_status=ParsingStatus.COMPLETED,
        total_chapters=2,
        total_word_count=500
    )
    mock_repository.find_by_id.return_value = dummy_book

    use_case = GetBookMetadataUseCase(mock_repository)
    dto = await use_case.execute("bk_test_01")

    assert dto.id == "bk_test_01"
    assert dto.file_name == "test.txt"
    assert dto.parsing_status == "COMPLETED"
    assert dto.total_chapters == 2


@pytest.mark.asyncio
async def test_get_book_metadata_not_found(mock_repository):
    mock_repository.find_by_id.return_value = None

    use_case = GetBookMetadataUseCase(mock_repository)
    with pytest.raises(BookNotFoundException):
        await use_case.execute("bk_non_existent")


@pytest.mark.asyncio
async def test_get_book_toc_success(mock_repository):
    dummy_toc = [
        {"id": "toc_1", "title": "Chapter 1", "children": []}
    ]
    dummy_book = Book(
        id="bk_test_01",
        project_id="proj_01",
        file_name="test.txt",
        file_type=BookFileType.TXT,
        file_size=1024,
        storage_path="/path/test.txt",
        content_json_path="/path/parsed_content.json",
        parsing_status=ParsingStatus.COMPLETED,
        parsed_structure=dummy_toc
    )
    mock_repository.find_by_id.return_value = dummy_book

    domain_service = BookTocQueryDomainService(mock_repository)
    use_case = GetBookTocUseCase(domain_service)
    dto = await use_case.execute("bk_test_01")

    assert dto.book_id == "bk_test_01"
    assert dto.toc_tree == dummy_toc


@pytest.mark.asyncio
async def test_get_chapter_content_success(mock_repository, mock_file_storage):
    dummy_book = Book(
        id="bk_test_01",
        project_id="proj_01",
        file_name="test.txt",
        file_type=BookFileType.TXT,
        file_size=1024,
        storage_path="/path/test.txt",
        content_json_path="/path/parsed_content.json",
        parsing_status=ParsingStatus.COMPLETED
    )
    mock_repository.find_by_id.return_value = dummy_book

    all_content = {
        "chap_01": [
            {"block_id": "b_01", "sequence_index": 0, "text": "Hello world"},
            {"block_id": "b_02", "sequence_index": 1, "text": "Paragraph 2"}
        ],
        "chap_02": [
            {"block_id": "b_03", "sequence_index": 0, "text": "Chapter 2 Content"}
        ]
    }
    mock_file_storage.read_all_parsed_content.return_value = all_content

    domain_service = BookChapterContentDomainService(mock_repository, mock_file_storage)
    use_case = GetChapterContentUseCase(domain_service)
    dto = await use_case.execute("bk_test_01", "chap_01", offset=0, limit=1)

    assert dto.book_id == "bk_test_01"
    assert dto.chapter_id == "chap_01"
    assert dto.chapter_index == 0
    assert dto.total_blocks == 2
    assert dto.has_more is True
    assert dto.prev_chapter_id is None
    assert dto.next_chapter_id == "chap_02"
    assert len(dto.blocks) == 1
    assert dto.blocks[0].block_id == "b_01"


@pytest.mark.asyncio
async def test_get_chapter_content_chapter_not_found(mock_repository, mock_file_storage):
    dummy_book = Book(
        id="bk_test_01",
        project_id="proj_01",
        file_name="test.txt",
        file_type=BookFileType.TXT,
        file_size=1024,
        storage_path="/path/test.txt",
        content_json_path="/path/parsed_content.json",
        parsing_status=ParsingStatus.COMPLETED
    )
    mock_repository.find_by_id.return_value = dummy_book
    mock_file_storage.read_all_parsed_content.return_value = {"chap_01": []}

    domain_service = BookChapterContentDomainService(mock_repository, mock_file_storage)
    use_case = GetChapterContentUseCase(domain_service)
    with pytest.raises(ChapterNotFoundException):
        await use_case.execute("bk_test_01", "chap_invalid")


@pytest.mark.asyncio
async def test_get_chapter_content_book_not_completed(mock_repository, mock_file_storage):
    dummy_book = Book(
        id="bk_test_01",
        project_id="proj_01",
        file_name="test.txt",
        file_type=BookFileType.TXT,
        file_size=1024,
        storage_path="/path/test.txt",
        content_json_path="",
        parsing_status=ParsingStatus.PARSING
    )
    mock_repository.find_by_id.return_value = dummy_book

    domain_service = BookChapterContentDomainService(mock_repository, mock_file_storage)
    use_case = GetChapterContentUseCase(domain_service)
    with pytest.raises(BookParsingFailedException):
        await use_case.execute("bk_test_01", "chap_01")


@pytest.mark.asyncio
async def test_create_book_use_case_success(mock_repository):
    from app.domain.book.services import BookCreationDomainService
    from app.application.book.use_cases import CreateBookUseCase
    from app.application.book.dtos import CreateBookRequestDTO

    mock_repository.save.side_effect = lambda book: book

    domain_service = BookCreationDomainService(mock_repository)
    use_case = CreateBookUseCase(domain_service)

    req = CreateBookRequestDTO(
        project_id="proj_01",
        file_name="demo.epub",
        file_type="EPUB",
        file_size=1024,
        storage_path="/path/demo.epub"
    )
    dto = await use_case.execute(req)

    assert dto.project_id == "proj_01"
    assert dto.file_name == "demo.epub"
    assert dto.file_type == "EPUB"
    assert dto.parsing_status == "PENDING"


@pytest.mark.asyncio
async def test_get_chapter_content_cache_hit(mock_repository, mock_file_storage):
    from app.utils.cache import LRUCache

    dummy_book = Book(
        id="bk_test_cache",
        project_id="proj_01",
        file_name="test.txt",
        file_type=BookFileType.TXT,
        file_size=1024,
        storage_path="/path/test.txt",
        content_json_path="/path/cache_test.json",
        parsing_status=ParsingStatus.COMPLETED
    )
    mock_repository.find_by_id.return_value = dummy_book

    all_content = {
        "chap_01": [{"block_id": "b_01", "sequence_index": 0, "text": "Content 1"}]
    }
    mock_file_storage.read_all_parsed_content.return_value = all_content

    # 使用独立的 LRUCache 实例测试隔离
    custom_cache = LRUCache(capacity=10)
    domain_service = BookChapterContentDomainService(
        repository=mock_repository,
        file_storage=mock_file_storage,
        cache=custom_cache
    )
    use_case = GetChapterContentUseCase(domain_service)

    # 首次查询：触发 file_storage 读取
    dto1 = await use_case.execute("bk_test_cache", "chap_01")
    assert dto1.chapter_id == "chap_01"
    assert mock_file_storage.read_all_parsed_content.call_count == 1

    # 第二次查询：命中 LRU 缓存，不应该再次触发 file_storage 读取
    dto2 = await use_case.execute("bk_test_cache", "chap_01")
    assert dto2.chapter_id == "chap_01"
    assert mock_file_storage.read_all_parsed_content.call_count == 1


