"""书籍领域异常体系 (遵循自描述 RFC 7807 协议)"""

from app.domain.common.exceptions import DomainException


class BookDomainException(DomainException):
    """书籍领域基类异常"""

    error_type: str = "book-domain-error"
    title: str = "Book Domain Error"
    status_code: int = 400

    def __init__(self, message: str, error_code: str = "BOOK_DOMAIN_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(
            detail=message,
            extension_fields={"error_code": error_code},
        )


class BookNotFoundException(BookDomainException):
    """未找到书籍异常"""

    error_type: str = "book-not-found"
    title: str = "Book Not Found"
    status_code: int = 404

    def __init__(self, book_id: str):
        super().__init__(f"未找到图书: {book_id}", error_code="BOOK_NOT_FOUND")


class UnsupportedBookFormatException(BookDomainException):
    """不支持的书籍格式异常"""

    error_type: str = "unsupported-book-format"
    title: str = "Unsupported Book Format"
    status_code: int = 400

    def __init__(self, file_type: str):
        super().__init__(f"不支持的书籍格式: {file_type}", error_code="UNSUPPORTED_BOOK_FORMAT")


class InvalidStateTransitionException(BookDomainException):
    """非法解析状态机转换异常"""

    error_type: str = "invalid-state-transition"
    title: str = "Invalid State Transition"
    status_code: int = 409

    def __init__(self, current_status: str, target_status: str):
        super().__init__(
            f"不允许的状态转移: [{current_status}] -> [{target_status}]",
            error_code="INVALID_STATE_TRANSITION",
        )


class BookParsingFailedException(BookDomainException):
    """解析过程异常"""

    error_type: str = "book-parsing-failed"
    title: str = "Book Parsing Failed"
    status_code: int = 422

    def __init__(self, book_id: str, reason: str):
        super().__init__(f"图书 {book_id} 解析失败: {reason}", error_code="BOOK_PARSING_FAILED")


class ChapterNotFoundException(BookDomainException):
    """未找到章节内容异常"""

    error_type: str = "chapter-not-found"
    title: str = "Chapter Not Found"
    status_code: int = 404

    def __init__(self, chapter_id: str):
        super().__init__(f"未找到章节: {chapter_id}", error_code="CHAPTER_NOT_FOUND")


