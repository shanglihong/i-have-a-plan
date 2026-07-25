"""书籍与物理锚点领域上下文包"""

from .entities import Book, TocNode, SourceAnchor, ContentBlock, ParsingStatus, BookFileType
from .events import BookParseRequestedEvent, BookParsedEvent, BookDeletedEvent
from .ports import BookRepositoryPort, BookFileStoragePort, BookEventBusPort
from .services import BookParsingEngineService, BookSandboxHealingService
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
    "ParsingStatus",
    "BookFileType",
    "BookParseRequestedEvent",
    "BookParsedEvent",
    "BookDeletedEvent",
    "BookRepositoryPort",
    "BookFileStoragePort",
    "BookEventBusPort",
    "BookParsingEngineService",
    "BookSandboxHealingService",
    "BookDomainException",
    "BookNotFoundException",
    "UnsupportedBookFormatException",
    "InvalidStateTransitionException",
    "BookParsingFailedException",
]
