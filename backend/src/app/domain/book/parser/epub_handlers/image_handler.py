import ebooklib
from typing import Tuple, Optional, Set, Dict, Any
from ebooklib import epub
from app.domain.book.entities import ContentBlock, BlockType
from app.domain.book.parser.epub_handlers.base import IElementHandler


class ImageElementHandler(IElementHandler):
    """图片 (img, image) 节点解析策略"""

    @property
    def supported_tags(self) -> Set[str]:
        return {'img', 'image'}

    def parse(
        self,
        el,
        item: epub.EpubItem,
        chap_id: str,
        seq: int,
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[ContentBlock], str, str]:
        src = el.get('src', '').strip() or el.get('xlink:href', '').strip() or el.get('href', '').strip()
        if not src:
            return None, "", ""

        alt = el.get('alt', '').strip() or el.get('title', '').strip()
        if not alt:
            if el.parent and el.parent.name.lower() in ('figure', 'svg'):
                figcaption = el.parent.find('figcaption')
                if figcaption:
                    alt = figcaption.get_text().strip()
            if not alt and hasattr(el, 'find_next_sibling'):
                sibling_caption = el.find_next_sibling('figcaption')
                if sibling_caption:
                    alt = sibling_caption.get_text().strip()

        if not alt:
            is_cover = item.get_type() == ebooklib.ITEM_COVER or "cover" in (item.get_name() or "").lower()
            alt = "封面" if is_cover else "图片"

        b_id = f"b_{chap_id}_{seq:03d}"
        el_id = el.get('id', '') or (el.parent.get('id', '') if el.parent and el.parent.name.lower() in ('figure', 'svg') else '')

        block = ContentBlock(
            block_id=b_id,
            block_type=BlockType.IMAGE,
            sequence_index=seq,
            text=alt,
            html_or_markdown=str(el)
        )
        return block, b_id, el_id
