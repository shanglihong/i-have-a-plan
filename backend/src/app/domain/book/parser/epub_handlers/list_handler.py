from typing import Tuple, Optional, Set, Dict, Any
from ebooklib import epub
from app.domain.book.entities import ContentBlock, BlockType
from app.domain.book.parser.epub_handlers.base import IElementHandler


class ListElementHandler(IElementHandler):
    """列表 (ul, ol) 节点容器解析策略"""

    @property
    def supported_tags(self) -> Set[str]:
        return {'ul', 'ol'}

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
        tag_name = el.name.lower()
        is_ol = tag_name == 'ol'

        li_elements = el.find_all('li')
        lines = []

        if li_elements:
            for idx, li in enumerate(li_elements, start=1):
                raw_text = self._extract_li_text(li)
                if not raw_text:
                    continue
                if is_ol:
                    if li.has_attr('value') and str(li['value']).isdigit():
                        curr_idx = int(li['value'])
                    else:
                        curr_idx = idx
                    prefix = f"{curr_idx}"
                else:
                    prefix = "•"
                lines.append(f"{prefix} {raw_text}")
        else:
            raw_text = el.get_text(separator="\n", strip=True)
            if raw_text:
                for line in raw_text.splitlines():
                    cleaned = line.strip()
                    if cleaned:
                        prefix = "1" if is_ol else "•"
                        lines.append(f"{prefix} {cleaned}")

        if not lines:
            return None, "", ""

        text = "\n".join(lines)
        b_id = f"b_{chap_id}_{seq:03d}"
        el_id = el.get('id', '')

        block = ContentBlock(
            block_id=b_id,
            block_type=BlockType.LIST,
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

