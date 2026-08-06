from typing import Tuple, Optional, Set, Dict, Any
from ebooklib import epub
from app.domain.book.entities import ContentBlock, BlockType
from app.domain.book.parser.epub_handlers.base import IElementHandler


class DefinitionElementHandler(IElementHandler):
    """定义列表 (dt, dd) 节点解析策略"""

    @property
    def supported_tags(self) -> Set[str]:
        return {'dt', 'dd'}

    @property
    def is_container(self) -> bool:
        return True

    def parse(
        self,
        el,
        item: epub.EpubItem,
        chap_id: str,
        seq: int,
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[ContentBlock], str, str]:
        text = el.get_text().strip()
        if not text:
            return None, "", ""

        b_id = f"b_{chap_id}_{seq:03d}"
        el_id = el.get('id', '')

        tag_name = el.name.lower()
        if tag_name == 'dt':
            formatted_text = f"【{text}】"
        else:
            formatted_text = text

        block = ContentBlock(
            block_id=b_id,
            block_type=BlockType.PARAGRAPH,
            sequence_index=seq,
            text=formatted_text,
            html_or_markdown=str(el)
        )
        return block, b_id, el_id
