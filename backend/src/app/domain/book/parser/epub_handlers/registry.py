from typing import Dict, List, Set, Tuple, Optional, Any
from ebooklib import epub
from app.domain.book.entities import ContentBlock
from app.domain.book.parser.epub_handlers.base import IElementHandler
from app.domain.book.parser.epub_handlers.image_handler import ImageElementHandler
from app.domain.book.parser.epub_handlers.table_handler import TableElementHandler
from app.domain.book.parser.epub_handlers.code_handler import CodeElementHandler
from app.domain.book.parser.epub_handlers.quote_handler import QuoteElementHandler
from app.domain.book.parser.epub_handlers.list_handler import ListElementHandler
from app.domain.book.parser.epub_handlers.definition_handler import DefinitionElementHandler
from app.domain.book.parser.epub_handlers.heading_handler import HeadingParagraphHandler


class ElementHandlerRegistry:
    """HTML 元素解析 Handler 注册分发中心"""

    def __init__(self, handlers: Optional[List[IElementHandler]] = None):
        self._tag_map: Dict[str, IElementHandler] = {}
        self._container_tags: Set[str] = set()
        self._supported_tags: Set[str] = set()

        default_handlers = handlers or [
            ImageElementHandler(),
            TableElementHandler(),
            CodeElementHandler(),
            QuoteElementHandler(),
            ListElementHandler(),
            DefinitionElementHandler(),
            HeadingParagraphHandler(),
        ]

        for h in default_handlers:
            self.register(h)

    def register(self, handler: IElementHandler) -> None:
        """注册新的 Handler 实例"""
        for tag in handler.supported_tags:
            tag_lower = tag.lower()
            self._tag_map[tag_lower] = handler
            self._supported_tags.add(tag_lower)
            if handler.is_container:
                self._container_tags.add(tag_lower)

    @property
    def supported_tags(self) -> List[str]:
        """所有被已注册 Handler 支持的 HTML 标签列表"""
        return list(self._supported_tags)

    def parse_element(
        self,
        el,
        item: epub.EpubItem,
        chap_id: str,
        seq: int,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Tuple[Optional[ContentBlock], str, str]]:
        """根据 DOM 元素分发至对应 Handler 执行解析，同时执行父子容器拦截防重"""
        ctx = context if context is not None else {}
        processed_elements = ctx.setdefault('processed_elements', set())

        # 若节点已被容器 Handler 显式解包处理，防止二次提取
        if id(el) in processed_elements:
            return []

        tag_name = el.name.lower()
        handler = self._tag_map.get(tag_name)
        if not handler:
            return []

        # 容器内节点防重拦截
        if tag_name in ('img', 'image'):
            # 图片节点：只有处在 table 或 pre 代码块内部时才彻底拦截
            if el.find_parent(['table', 'pre']):
                return []
        elif not handler.is_container:
            # 普通非容器节点（如 p, h1-h6 等）：处在任何文本容器 (table, pre, blockquote, aside, figure, li, dt, dd) 内部时拦截防重
            if el.find_parent(list(self._container_tags.union({'figure'}))):
                return []
        else:
            # 容器节点（如 li, blockquote, aside, dt, dd 等）：处在父级更高级容器内部时的拦截逻辑
            if tag_name == 'li' and el.find_parent(['table', 'pre', 'blockquote', 'aside']):
                return []
            if tag_name in ('blockquote', 'aside') and el.find_parent(['table', 'pre']):
                return []
            if tag_name in ('dt', 'dd') and el.find_parent(['table', 'pre', 'blockquote', 'aside', 'li']):
                return []

        # 标记当前节点已处理
        processed_elements.add(id(el))

        result = handler.parse(el, item, chap_id, seq, ctx)
        if not result:
            return []

        if isinstance(result, list):
            # 将容器解包产生的所有内部 DOM 子元素的引用标记为已处理
            for child in el.find_all(True):
                processed_elements.add(id(child))
            return [res for res in result if res and res[0]]
        else:
            return [result] if result[0] else []
