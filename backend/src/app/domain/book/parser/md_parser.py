"""Markdown 解析策略"""

import re
from typing import List, Dict, Tuple
from app.domain.book.entities import TocNode, ContentBlock, BlockType
from app.domain.book.strategies.base import IBookParser


class MdParserStrategy(IBookParser):
    """Markdown 解析策略"""

    HEADING_PATTERN = re.compile(r'^(#{1,6})\s+(.+)$')

    def parse(self, file_path: str) -> Tuple[List[TocNode], Dict[str, List[ContentBlock]]]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        toc_tree: List[TocNode] = []
        chapter_blocks: Dict[str, List[ContentBlock]] = {}

        current_chap_id = "chap_01"
        current_chap_title = "前言/概述"
        current_blocks: List[ContentBlock] = []
        chap_counter = 1
        seq_counter = 0

        def save_chap():
            if current_blocks:
                chapter_blocks[current_chap_id] = list(current_blocks)
                if not any(node.target_chapter_id == current_chap_id for node in toc_tree):
                    toc_tree.append(TocNode(
                        id=f"toc_{current_chap_id}",
                        title=current_chap_title,
                        level=1,
                        target_chapter_id=current_chap_id,
                        target_block_id=current_blocks[0].block_id
                    ))

        for line in lines:
            text = line.strip()
            if not text:
                continue

            h_match = self.HEADING_PATTERN.match(text)
            if h_match:
                level = len(h_match.group(1))
                title = h_match.group(2).strip()

                if level == 1:
                    save_chap()
                    chap_counter += 1
                    current_chap_id = f"chap_{chap_counter:02d}"
                    current_chap_title = title
                    current_blocks = []
                    seq_counter = 0

                seq_counter += 1
                b_id = f"b_{current_chap_id}_{seq_counter:03d}"
                block = ContentBlock(
                    block_id=b_id,
                    block_type=BlockType.HEADING,
                    sequence_index=seq_counter,
                    text=title,
                    html_or_markdown=text
                )
                current_blocks.append(block)

                if level > 1:
                    toc_tree.append(TocNode(
                        id=f"toc_{b_id}",
                        title=title,
                        level=level,
                        target_chapter_id=current_chap_id,
                        target_block_id=b_id
                    ))
            elif text.startswith("```"):
                seq_counter += 1
                b_id = f"b_{current_chap_id}_{seq_counter:03d}"
                current_blocks.append(ContentBlock(
                    block_id=b_id,
                    block_type=BlockType.CODE,
                    sequence_index=seq_counter,
                    text=text,
                    html_or_markdown=text
                ))
            elif text.startswith(">"):
                seq_counter += 1
                b_id = f"b_{current_chap_id}_{seq_counter:03d}"
                clean_text = text.lstrip(">").strip()
                current_blocks.append(ContentBlock(
                    block_id=b_id,
                    block_type=BlockType.QUOTE,
                    sequence_index=seq_counter,
                    text=clean_text,
                    html_or_markdown=text
                ))
            else:
                seq_counter += 1
                b_id = f"b_{current_chap_id}_{seq_counter:03d}"
                current_blocks.append(ContentBlock(
                    block_id=b_id,
                    block_type=BlockType.PARAGRAPH,
                    sequence_index=seq_counter,
                    text=text,
                    html_or_markdown=f"<p>{text}</p>"
                ))

        save_chap()
        return toc_tree, chapter_blocks
