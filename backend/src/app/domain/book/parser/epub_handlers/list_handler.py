from typing import Tuple, Optional, Set, Dict, Any
from ebooklib import epub
from app.domain.book.entities import ContentBlock, BlockType
from app.domain.book.parser.epub_handlers.base import IElementHandler


class ListElementHandler(IElementHandler):
    """列表项 (li) 节点解析策略"""

    @property
    def supported_tags(self) -> Set[str]:
        return {'li'}

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
        raw_text = self._extract_li_text(el)
        if not raw_text:
            return None, "", ""

        parent_ol = el.find_parent('ol')
        if parent_ol:
            if el.has_attr('value') and str(el['value']).isdigit():
                idx = int(el['value'])
            else:
                sibling_lis = parent_ol.find_all('li', recursive=False)
                if el in sibling_lis:
                    idx = sibling_lis.index(el) + 1
                else:
                    all_lis = parent_ol.find_all('li')
                    idx = all_lis.index(el) + 1 if el in all_lis else 1
            prefix = f"{idx}."
        else:
            prefix = "•"

        text = f"{prefix} {raw_text}"
        b_id = f"b_{chap_id}_{seq:03d}"
        el_id = el.get('id', '')

        block = ContentBlock(
            block_id=b_id,
            block_type=BlockType.PARAGRAPH,
            sequence_index=seq,
            text=text,
            html_or_markdown=str(el)
        )
        return block, b_id, el_id

    def _extract_li_text(self, el) -> str:
        text_parts = []
        for child in el.descendants:
            if child.name in ('ul', 'ol'):
                continue
            if child.parent and child.parent.name in ('ul', 'ol'):
                continue
            if isinstance(child, str):
                text_parts.append(child)
        return " ".join("".join(text_parts).split())
