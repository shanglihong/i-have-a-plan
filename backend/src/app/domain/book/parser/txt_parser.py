"""TXT 纯文本解析策略"""

import re
from typing import List, Dict, Tuple
from app.domain.book.entities import TocNode, ContentBlock, BlockType
from app.domain.book.strategies.base import IBookParser


class TxtParserStrategy(IBookParser):
    """TXT 纯文本解析策略"""

    CHAPTER_PATTERN = re.compile(
        r'^(第[0-9一二三四五六七八九十百千]+[章卷节部]|Chapter\s+\d+|[0-9]+\.\s+).{0,30}$',
        re.IGNORECASE
    )

    def parse(self, file_path: str) -> Tuple[List[TocNode], Dict[str, List[ContentBlock]]]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        toc_tree: List[TocNode] = []
        chapter_blocks: Dict[str, List[ContentBlock]] = {}

        current_chapter_id = "chap_01"
        current_chapter_title = "正文"
        current_chapter_blocks: List[ContentBlock] = []

        toc_counter = 1
        block_counter = 0

        def finalize_chapter(chap_id: str, chap_title: str, blocks: List[ContentBlock]):
            if not blocks:
                return
            first_block_id = blocks[0].block_id
            toc_tree.append(
                TocNode(
                    id=f"toc_{chap_id}",
                    title=chap_title,
                    level=1,
                    target_chapter_id=chap_id,
                    target_block_id=first_block_id
                )
            )
            chapter_blocks[chap_id] = blocks

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            if self.CHAPTER_PATTERN.match(line_str):
                # 触发新章节
                if current_chapter_blocks:
                    finalize_chapter(current_chapter_id, current_chapter_title, current_chapter_blocks)
                    toc_counter += 1
                    current_chapter_id = f"chap_{toc_counter:02d}"

                current_chapter_title = line_str
                current_chapter_blocks = []
                block_counter = 0

                # 增加标题 Block
                block_counter += 1
                heading_block = ContentBlock(
                    block_id=f"b_{current_chapter_id}_{block_counter:03d}",
                    block_type=BlockType.HEADING,
                    sequence_index=block_counter,
                    text=line_str,
                    html_or_markdown=f"# {line_str}"
                )
                current_chapter_blocks.append(heading_block)
            else:
                block_counter += 1
                paragraph_block = ContentBlock(
                    block_id=f"b_{current_chapter_id}_{block_counter:03d}",
                    block_type=BlockType.PARAGRAPH,
                    sequence_index=block_counter,
                    text=line_str,
                    html_or_markdown=f"<p>{line_str}</p>"
                )
                current_chapter_blocks.append(paragraph_block)

        # 挂载最后一个章节
        if current_chapter_blocks:
            finalize_chapter(current_chapter_id, current_chapter_title, current_chapter_blocks)

        # 如果没有识别出任何章节，保底兜底
        if not toc_tree and lines:
            chap_id = "chap_01"
            blocks = []
            for idx, line in enumerate(lines, 1):
                text = line.strip()
                if text:
                    blocks.append(ContentBlock(
                        block_id=f"b_{chap_id}_{idx:03d}",
                        block_type=BlockType.PARAGRAPH,
                        sequence_index=idx,
                        text=text,
                        html_or_markdown=f"<p>{text}</p>"
                    ))
            if blocks:
                finalize_chapter(chap_id, "全文", blocks)

        return toc_tree, chapter_blocks
