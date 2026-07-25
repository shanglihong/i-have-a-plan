"""电子书解析策略模块包"""

from app.domain.book.strategies.base import IBookParser
from app.domain.book.strategies.txt_strategy import TxtParserStrategy
from app.domain.book.strategies.md_strategy import MdParserStrategy
from app.domain.book.strategies.epub_strategy import EpubParserStrategy
from app.domain.book.strategies.pdf_strategy import PdfParserStrategy
from app.domain.book.strategies.factory import ParserFactory

__all__ = [
    "IBookParser",
    "TxtParserStrategy",
    "MdParserStrategy",
    "EpubParserStrategy",
    "PdfParserStrategy",
    "ParserFactory",
]
