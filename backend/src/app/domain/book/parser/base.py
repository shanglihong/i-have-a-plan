"""电子书解析策略抽象基类"""

from abc import ABC, abstractmethod
from typing import List, Dict, Tuple
from app.domain.book.entities import TocNode, ContentBlock


class IBookParser(ABC):
    """书籍解析策略抽象接口"""

    @abstractmethod
    def parse(self, file_path: str) -> Tuple[List[TocNode], Dict[str, List[ContentBlock]]]:
        """
        解析指定物理文件
        Returns: 目录树和章节内容块
            (toc_tree: List[TocNode], chapter_blocks: Dict[chapter_id, List[ContentBlock]])
        """
        ...
