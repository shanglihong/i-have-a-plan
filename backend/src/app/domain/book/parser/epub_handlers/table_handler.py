from typing import Tuple, Optional, Set, Dict, Any
from ebooklib import epub
from app.domain.book.entities import ContentBlock, BlockType
from app.domain.book.parser.epub_handlers.base import IElementHandler


class TableElementHandler(IElementHandler):
    """表格 (table) 节点解析策略"""

    @property
    def supported_tags(self) -> Set[str]:
        return {'table'}

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
        rows = []
        for tr in el.find_all('tr'):
            cells = [td.get_text(strip=True).replace('|', '\\|') for td in tr.find_all(['th', 'td'])]
            if cells:
                rows.append(cells)

        plain_text = el.get_text(separator=" ", strip=True)
        if not plain_text:
            return None, "", ""

        if not rows:
            markdown_table = str(el)
        else:
            max_cols = max(len(r) for r in rows)
            header = rows[0]
            header += [''] * (max_cols - len(header))

            md_lines = ["| " + " | ".join(header) + " |"]
            md_lines.append("| " + " | ".join(['---'] * max_cols) + " |")

            for row in rows[1:]:
                row += [''] * (max_cols - len(row))
                md_lines.append("| " + " | ".join(row) + " |")

            markdown_table = "\n".join(md_lines)

        b_id = f"b_{chap_id}_{seq:03d}"
        el_id = el.get('id', '')

        block = ContentBlock(
            block_id=b_id,
            block_type=BlockType.TABLE,
            sequence_index=seq,
            text=plain_text,
            html_or_markdown=markdown_table
        )
        return block, b_id, el_id
