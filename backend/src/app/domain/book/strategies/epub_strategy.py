"""EPUB 解析策略"""

from typing import List, Dict, Tuple, Set
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

        # 提取 EPUB 原生 TOC 中的标题与锚点集合
        toc_titles, toc_anchors = self._extract_toc_info(book.toc)

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
                b_id = f"b_{chap_id}_{seq:03d}"

                is_heading, level = self._is_heading_element(el, text, toc_titles, toc_anchors)

                if is_heading:
                    b_type = BlockType.HEADING
                    if seq == 1 or chap_title.startswith("章节"):
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
                # 若无任何 HEADING 节点，保底在 toc_tree 添加节点
                if not any(node.target_chapter_id == chap_id for node in toc_tree):
                    toc_tree.append(TocNode(
                        id=f"toc_{chap_id}",
                        title=chap_title,
                        level=1,
                        target_chapter_id=chap_id,
                        target_block_id=blocks[0].block_id
                    ))

        return toc_tree, chapter_blocks

    def _extract_toc_info(self, toc_items) -> Tuple[Set[str], Set[str]]:
        """从 epub.toc 中递归提取标题文本集合与 ID 锚点集合"""
        titles: Set[str] = set()
        anchors: Set[str] = set()

        if not toc_items:
            return titles, anchors

        for item in toc_items:
            if isinstance(item, (list, tuple)):
                sub_titles, sub_anchors = self._extract_toc_info(item)
                titles.update(sub_titles)
                anchors.update(sub_anchors)
            elif hasattr(item, 'title'):
                if item.title:
                    titles.add(item.title.strip())
                if hasattr(item, 'href') and item.href and '#' in item.href:
                    anchors.add(item.href.split('#')[-1])

        return titles, anchors

    def _is_heading_element(
        self,
        el,
        text: str,
        toc_titles: Set[str],
        toc_anchors: Set[str]
    ) -> Tuple[bool, int]:
        """判断 HTML 元素是否为标题并返回层级 (is_heading, level)"""
        tag_name = el.name.lower()

        # 1. 标准 h1 ~ h6 标签
        if tag_name.startswith('h') and len(tag_name) == 2 and tag_name[1].isdigit():
            level = int(tag_name[1])
            return True, level

        # 2. 原生 TOC 锚点匹配或文本匹配
        el_id = el.get('id', '')
        if el_id and el_id in toc_anchors:
            return True, 2

        if text in toc_titles and len(text) <= 80:
            return True, 2

        # 3. 启发式：基于加粗样式、CSS 类名与短文本特征识别
        if tag_name == 'p':
            el_classes = ' '.join(el.get('class', [])) if el.get('class') else ''
            
            # 判断是否包含粗体标签或包含 bold/title 相关的 CSS class
            has_bold_tag = bool(el.find(['b', 'strong']))
            has_bold_class = any(k in el_classes.lower() for k in ['bold', 'title', 'heading', 'chap'])
            has_child_bold_class = bool(el.find(class_=lambda c: c and any(k in str(c).lower() for k in ['bold', 'title', 'heading'])))

            is_styled_heading = has_bold_tag or has_bold_class or has_child_bold_class

            # 约束条件：文本长度不超过 60 个字符，且不以段落句号结尾
            is_short_text = len(text) <= 60
            not_ending_punctuation = not text.endswith(('。', '；', '?', '!', '.', ';'))

            if is_styled_heading and is_short_text and not_ending_punctuation:
                return True, 2

        return False, 1

