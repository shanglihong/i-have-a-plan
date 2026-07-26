"""电子书解析策略模块包"""

from app.domain.book.parser.base import IBookParser
from app.domain.book.parser.txt_parser import TxtParser
from app.domain.book.parser.md_parser import MdParser
from app.domain.book.parser.epub_parser import EpubParser
from app.domain.book.parser.pdf_parser import PdfParser
from app.domain.book.parser.factory import ParserFactory

__all__ = [
    "IBookParser",
    "TxtParser",
    "MdParser",
    "EpubParser",
    "PdfParser",
    "ParserFactory",
]
