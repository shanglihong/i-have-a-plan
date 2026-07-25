"""书籍与物理锚点领域上下文包"""

from .entities import Book, TocNode, SourceAnchor, ContentBlock, ChapterContent, ParsingStatus, BookFileType
from .events import BookParseRequestedEvent, BookParsedEvent, BookDeletedEvent
from .ports import BookRepositoryPort, BookFileStoragePort, BookEventBusPort
from .services import BookParsingEngineService, BookHealingDomainService
from .exceptions import (
    BookDomainException,
    BookNotFoundException,
    UnsupportedBookFormatException,
    InvalidStateTransitionException,
    BookParsingFailedException
)

__all__ = [
    "Book",
    "TocNode",
    "SourceAnchor",
    "ContentBlock",
    "ChapterContent",
    "ParsingStatus",
    "BookFileType",
    "BookParseRequestedEvent",
    "BookParsedEvent",
    "BookDeletedEvent",
    "BookRepositoryPort",
    "BookFileStoragePort",
    "BookEventBusPort",
    "BookParsingEngineService",
    "BookHealingDomainService",
    "BookDomainException",
    "BookNotFoundException",
    "UnsupportedBookFormatException",
    "InvalidStateTransitionException",
    "BookParsingFailedException",
]
