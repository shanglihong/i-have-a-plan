"""电子书解析工厂类"""

from app.domain.book.entities import BookFileType
from app.domain.book.exceptions import UnsupportedBookFormatException
from app.domain.book.strategies.base import IBookParser
from app.domain.book.strategies.txt_strategy import TxtParserStrategy
from app.domain.book.strategies.md_strategy import MdParserStrategy
from app.domain.book.strategies.epub_strategy import EpubParserStrategy
from app.domain.book.strategies.pdf_strategy import PdfParserStrategy


class ParserFactory:
    """电子书解析工厂类"""

    @staticmethod
    def get_parser(file_type: BookFileType) -> IBookParser:
        if file_type == BookFileType.TXT:
            return TxtParserStrategy()
        elif file_type == BookFileType.MD:
            return MdParserStrategy()
        elif file_type == BookFileType.EPUB:
            return EpubParserStrategy()
        elif file_type == BookFileType.PDF:
            return PdfParserStrategy()
        else:
            raise UnsupportedBookFormatException(str(file_type))
