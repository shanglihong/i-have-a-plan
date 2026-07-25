"""PDF 解析策略"""

from typing import List, Dict, Tuple
from app.domain.book.entities import TocNode, ContentBlock, BlockType
from app.domain.book.strategies.base import IBookParser


class PdfParserStrategy(IBookParser):
    """PDF 解析策略"""

    def parse(self, file_path: str) -> Tuple[List[TocNode], Dict[str, List[ContentBlock]]]:
        from pypdf import PdfReader

        reader = PdfReader(file_path)
        toc_tree: List[TocNode] = []
        chapter_blocks: Dict[str, List[ContentBlock]] = {}

        total_pages = len(reader.pages)

        for page_idx in range(total_pages):
            page_num = page_idx + 1
            chap_id = f"chap_p{page_num:03d}"
            page = reader.pages[page_idx]
            raw_text = page.extract_text() or ""
            lines = [l.strip() for l in raw_text.split('\n') if l.strip()]

            blocks: List[ContentBlock] = []
            for seq, line in enumerate(lines, 1):
                b_id = f"b_{chap_id}_{seq:03d}"
                b_type = BlockType.HEADING if seq == 1 else BlockType.PARAGRAPH
                blocks.append(ContentBlock(
                    block_id=b_id,
                    block_type=b_type,
                    sequence_index=seq,
                    text=line,
                    html_or_markdown=f"<p>{line}</p>",
                    page_number=page_num
                ))

            if blocks:
                chapter_blocks[chap_id] = blocks
                first_line = blocks[0].text if blocks else f"第 {page_num} 页"
                title = first_line[:30] if len(first_line) > 30 else first_line
                toc_tree.append(TocNode(
                    id=f"toc_{chap_id}",
                    title=f"第 {page_num} 页: {title}",
                    level=1,
                    target_chapter_id=chap_id,
                    target_block_id=blocks[0].block_id,
                    target_page=page_num
                ))

        return toc_tree, chapter_blocks
