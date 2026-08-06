from typing import Tuple, Optional, Set, Dict, Any
from ebooklib import epub
from app.domain.book.entities import ContentBlock, BlockType
from app.domain.book.parser.epub_handlers.base import IElementHandler


class HeadingParagraphHandler(IElementHandler):
    """标题 (h1-h6) 与标准段落 (p) 节点解析策略"""

    @property
    def supported_tags(self) -> Set[str]:
        return {'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'}

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

        toc_titles = context.get('toc_titles', set()) if context else set()
        toc_anchors = context.get('toc_anchors', set()) if context else set()

        is_heading, _ = self._is_heading_element(el, text, toc_titles, toc_anchors)
        b_type = BlockType.HEADING if is_heading else BlockType.PARAGRAPH

        block = ContentBlock(
            block_id=b_id,
            block_type=b_type,
            sequence_index=seq,
            text=text,
            html_or_markdown=str(el)
        )
        return block, b_id, el_id

    def _is_heading_element(self, el, text: str, toc_titles: Set[str], toc_anchors: Set[str]) -> Tuple[bool, int]:
        tag_name = el.name.lower()

        # 1. 链接校验：若整个元素仅为一个跳转链接，则不作为标题
        a_tag = el.find('a')
        if a_tag and a_tag.get('href'):
            href = a_tag.get('href')
            if '#' in href or href.endswith(('.xhtml', '.html', '.htm')):
                el_text = text.strip()
                a_text = a_tag.get_text().strip()
                if el_text == a_text:
                    return False, 1

        # 2. 原生 HTML h1 - h6 标题标签
        if tag_name.startswith('h') and len(tag_name) == 2 and tag_name[1].isdigit():
            level = int(tag_name[1])
            return True, level

        # 3. 元素 ID 匹配 book.toc 中定义的锚点
        el_id = el.get('id', '')
        if el_id and el_id in toc_anchors:
            return True, 2

        # 4. 文本匹配 book.toc 中记录的目录标题
        if text in toc_titles:
            return True, 2

        return False, 1
