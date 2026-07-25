import pytest
from pydantic import ValidationError
from app.application.book.dtos import CreateBookRequestDTO
from app.domain.book.entities import BookFileType


def test_create_book_dto_file_type_validation_success():
    # 测试常规大写字符串
    dto1 = CreateBookRequestDTO(
        project_id="proj_01",
        file_name="test.pdf",
        file_type="PDF"
    )
    assert dto1.file_type == BookFileType.PDF

    # 测试小写自动转大写
    dto2 = CreateBookRequestDTO(
        project_id="proj_01",
        file_name="test.epub",
        file_type="epub"
    )
    assert dto2.file_type == BookFileType.EPUB


def test_create_book_dto_file_type_validation_failure():
    # 测试不支持的格式类型
    with pytest.raises(ValidationError) as exc_info:
        CreateBookRequestDTO(
            project_id="proj_01",
            file_name="test.docx",
            file_type="DOCX"
        )
    assert "Input should be 'PDF', 'EPUB', 'TXT' or 'MD'" in str(exc_info.value) or "file_type" in str(exc_info.value)


def test_create_book_dto_storage_path_validation_success():
    dto = CreateBookRequestDTO(
        project_id="proj_01",
        file_name="test.epub",
        file_type="EPUB",
        storage_path="  /sandbox/books/demo.epub  "
    )
    assert dto.storage_path == "/sandbox/books/demo.epub"


def test_create_book_dto_storage_path_validation_traversal_failure():
    with pytest.raises(ValidationError) as exc_info:
        CreateBookRequestDTO(
            project_id="proj_01",
            file_name="test.epub",
            file_type="EPUB",
            storage_path="../etc/passwd"
        )
    assert "storage_path 包含了非法的相对路径跳转字符" in str(exc_info.value)
