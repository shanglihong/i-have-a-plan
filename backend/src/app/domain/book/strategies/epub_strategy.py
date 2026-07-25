"""EPUB 解析策略"""

from typing import List, Dict, Tuple
from app.domain.book.entities import TocNode, ContentBlock, BlockType
from app.domain.book.strategies.base import IBookParser


class EpubParserStrategy(IBookParser):
    """EPUB 解析策略"""

    def parse(self, file_path: str) -> Tuple[List[TocNode], Dict[str, List[ContentBlock]]]:
        import ebooklib
        from ebooklib import epub
        from bs4 import BeautifulSoup

        book = epub.read_epub(file_path)
        toc_tree: List[TocNode] = []
        chapter_blocks: Dict[str, List[ContentBlock]] = {}

        chap_counter = 0

        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            content = item.get_content()
            soup = BeautifulSoup(content, 'html.parser')

            # 提取所有段落与标题
            elements = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'])
            if not elements:
                continue

            chap_counter += 1
            chap_id = f"chap_{chap_counter:02d}"
            blocks: List[ContentBlock] = []
            chap_title = f"章节 {chap_counter}"

            seq = 0
            for el in elements:
                text = el.get_text().strip()
                if not text:
                    continue

                seq += 1
                tag_name = el.name.lower()
                b_id = f"b_{chap_id}_{seq:03d}"

                if tag_name.startswith('h'):
                    b_type = BlockType.HEADING
                    level = int(tag_name[1])
                    if seq == 1 or not chap_title.startswith("章节"):
                        chap_title = text

                    toc_tree.append(TocNode(
                        id=f"toc_{b_id}",
                        title=text,
                        level=level,
                        target_chapter_id=chap_id,
                        target_block_id=b_id
                    ))
                else:
                    b_type = BlockType.PARAGRAPH

                blocks.append(ContentBlock(
                    block_id=b_id,
                    block_type=b_type,
                    sequence_index=seq,
                    text=text,
                    html_or_markdown=str(el)
                ))

            if blocks:
                chapter_blocks[chap_id] = blocks
                # 若无 h1-h6 触发，保底在 toc_tree 添加节点
                if not any(node.target_chapter_id == chap_id for node in toc_tree):
                    toc_tree.append(TocNode(
                        id=f"toc_{chap_id}",
                        title=chap_title,
                        level=1,
                        target_chapter_id=chap_id,
                        target_block_id=blocks[0].block_id
                    ))

        return toc_tree, chapter_blocks
