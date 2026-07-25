"""RFC 7807 全局异常处理器测试"""

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.error_handler import register_error_handlers
from app.domain.book.exceptions import (
    BookNotFoundException,
    UnsupportedBookFormatException,
    InvalidStateTransitionException,
    BookParsingFailedException,
    ChapterNotFoundException,
)


@pytest.fixture
def test_app():
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/test/book-not-found")
    def trigger_book_not_found():
        raise BookNotFoundException("bk_999")

    @app.get("/test/chapter-not-found")
    def trigger_chapter_not_found():
        raise ChapterNotFoundException("chap_888")

    @app.get("/test/unsupported-format")
    def trigger_unsupported_format():
        raise UnsupportedBookFormatException("DOCX")

    @app.get("/test/invalid-state")
    def trigger_invalid_state():
        raise InvalidStateTransitionException("PARSED", "PENDING")

    @app.get("/test/parsing-failed")
    def trigger_parsing_failed():
        raise BookParsingFailedException("bk_777", "Corrupted file")

    @app.get("/test/http-exception")
    def trigger_http_exception():
        raise HTTPException(status_code=403, detail="Permission Denied")

    @app.get("/test/internal-error")
    def trigger_internal_error():
        raise RuntimeError("Unexpected failure")

    return app


def test_book_not_found_rfc7807(test_app):
    client = TestClient(test_app)
    response = client.get("/test/book-not-found")
    assert response.status_code == 404
    data = response.json()
    assert data["status"] == 404
    assert data["type"] == "https://i-have-a-plan/errors/book-not-found"
    assert data["title"] == "Book Not Found"
    assert data["detail"] == "未找到图书: bk_999"
    assert data["extension_fields"]["error_code"] == "BOOK_NOT_FOUND"


def test_unsupported_format_rfc7807(test_app):
    client = TestClient(test_app)
    response = client.get("/test/unsupported-format")
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == 400
    assert data["type"] == "https://i-have-a-plan/errors/unsupported-book-format"
    assert data["title"] == "Unsupported Book Format"
    assert "不支持的书籍格式: DOCX" in data["detail"]


def test_invalid_state_transition_rfc7807(test_app):
    client = TestClient(test_app)
    response = client.get("/test/invalid-state")
    assert response.status_code == 409
    data = response.json()
    assert data["status"] == 409
    assert data["type"] == "https://i-have-a-plan/errors/invalid-state-transition"


def test_parsing_failed_rfc7807(test_app):
    client = TestClient(test_app)
    response = client.get("/test/parsing-failed")
    assert response.status_code == 422
    data = response.json()
    assert data["status"] == 422
    assert data["type"] == "https://i-have-a-plan/errors/book-parsing-failed"


def test_http_exception_rfc7807(test_app):
    client = TestClient(test_app)
    response = client.get("/test/http-exception")
    assert response.status_code == 403
    data = response.json()
    assert data["status"] == 403
    assert data["type"] == "https://i-have-a-plan/errors/http-error"
    assert data["detail"] == "Permission Denied"


def test_internal_server_error_rfc7807(test_app):
    client = TestClient(test_app, raise_server_exceptions=False)
    response = client.get("/test/internal-error")
    assert response.status_code == 500
    data = response.json()
    assert data["status"] == 500
    assert data["type"] == "https://i-have-a-plan/errors/internal-server-error"
    assert data["title"] == "Internal Server Error"
