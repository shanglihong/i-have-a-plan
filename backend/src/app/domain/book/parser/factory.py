"""电子书解析工厂类"""

from app.domain.book.entities import BookFileType
from app.domain.book.exceptions import UnsupportedBookFormatException
from app.domain.book.parser.base import IBookParser
from app.domain.book.parser.txt_parser import TxtParser
from app.domain.book.parser.md_parser import MdParser
from app.domain.book.parser.epub_parser import EpubParser
from app.domain.book.parser.pdf_parser import PdfParser


class ParserFactory:
    """电子书解析工厂类"""

    @staticmethod
    def get_parser(file_type: BookFileType) -> IBookParser:
        if file_type == BookFileType.TXT:
            return TxtParser()
        elif file_type == BookFileType.MD:
            return MdParser()
        elif file_type == BookFileType.EPUB:
            return EpubParser()
        elif file_type == BookFileType.PDF:
            return PdfParser()
        else:
            raise UnsupportedBookFormatException(str(file_type))
