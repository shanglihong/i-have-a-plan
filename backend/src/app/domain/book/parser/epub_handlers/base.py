from abc import ABC, abstractmethod
from typing import Tuple, Optional, Set, Dict, Any, List, Union
from ebooklib import epub
from app.domain.book.entities import ContentBlock


class IElementHandler(ABC):
    """HTML 元素解析 Handler 接口"""

    @property
    @abstractmethod
    def supported_tags(self) -> Set[str]:
        """当前 Handler 能够处理的 HTML 标签集合"""
        pass

    @property
    def is_container(self) -> bool:
        """标识是否为容器标签（为 True 时其内部的子元素将默认被过滤防重）"""
        return False

    @abstractmethod
    def parse(
        self,
        el,
        item: epub.EpubItem,
        chap_id: str,
        seq: int,
        context: Optional[Dict[str, Any]] = None
    ) -> Union[Tuple[Optional[ContentBlock], str, str], List[Tuple[Optional[ContentBlock], str, str]]]:
        """解析 DOM 节点，返回 (ContentBlock, block_id, element_id) 或多组三元组列表"""
        pass
