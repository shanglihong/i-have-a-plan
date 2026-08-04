import ebooklib
import os
from typing import List, Dict, Tuple, Set, Optional
from dataclasses import dataclass, field
from bs4 import BeautifulSoup
from ebooklib import epub
from app.domain.book.entities import TocNode, ContentBlock, BlockType
from app.domain.book.parser.base import IBookParser



@dataclass
class _RawTocItem:
    title: str
    href: Optional[str]
    level: int
    children: List["_RawTocItem"] = field(default_factory=list)


class EpubParser(IBookParser):
    """EPUB 专业解析策略（参考 Readium / Foliate 工业级实现）"""

    def parse(self, file_path: str) -> Tuple[List[TocNode], Dict[str, List[ContentBlock]]]:
        try:
            book = epub.read_epub(file_path)
        except Exception as e:
            raise ValueError(f"EPUB 文件损坏或解析流意外中断: {str(e)}") from e

        # 1. 依据 EPUB Spine 规范建立主阅读流 Document 顺序
        document_items = []
        if hasattr(book, 'spine') and book.spine:
            for spine_item in book.spine:
                item_id = spine_item[0] if isinstance(spine_item, (tuple, list)) else spine_item
                linear = spine_item[1] if isinstance(spine_item, (tuple, list)) and len(spine_item) > 1 else 'yes'
                if str(linear).lower() in ('no', 'false', '0'):
                    continue
                item = book.get_item_with_id(item_id)
                if item and item.get_type() == ebooklib.ITEM_DOCUMENT:
                    document_items.append(item)

        if not document_items:
            document_items = list(book.get_items_of_type(ebooklib.ITEM_DOCUMENT))

        chap_counter = 0
        chapter_blocks: Dict[str, List[ContentBlock]] = {}
        chapter_file_map: Dict[str, str] = {}  # 映射文件名/href -> chap_id
        chapter_element_ids: Dict[str, Dict[str, str]] = {}  # chap_id -> {element_id: block_id}

        fallback_toc_tree: List[TocNode] = []
        toc_titles, toc_anchors = self._extract_toc_info(book.toc)

        for item in document_items:
            content = item.get_content()
            soup = BeautifulSoup(content, 'html.parser')

            # 过滤 EPUB 导航/目录专用页面（防止 TOC 页面被当作正文重复解析）
            if self._is_toc_or_nav_item(book, item, soup):
                continue

            elements = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'])
            if not elements:
                continue

            chap_counter += 1
            chap_id = f"chap_{chap_counter:02d}"
            item_name = (item.get_name() or "").lower()
            chapter_file_map[item_name] = chap_id
            chapter_file_map[os.path.basename(item_name)] = chap_id

            blocks: List[ContentBlock] = []
            elem_id_map: Dict[str, str] = {}
            chap_title = f"章节 {chap_counter}"

            seq = 0
            for el in elements:
                text = el.get_text().strip()
                if not text:
                    continue

                seq += 1
                b_id = f"b_{chap_id}_{seq:03d}"

                el_id = el.get('id', '')
                if el_id:
                    elem_id_map[el_id] = b_id

                is_heading, level = self._is_heading_element(el, text, toc_titles, toc_anchors)

                if is_heading:
                    b_type = BlockType.HEADING
                    if seq == 1 or chap_title.startswith("章节"):
                        chap_title = text

                    fallback_toc_tree.append(TocNode(
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
                chapter_element_ids[chap_id] = elem_id_map

        # 2. 优先解析原生 book.toc，构建具备多级层次结构的权威目录树
        raw_toc_items = self._build_raw_toc_items(book.toc)

        if raw_toc_items:
            native_toc_tree = self._build_toc_tree_from_raw(
                raw_items=raw_toc_items,
                chapter_file_map=chapter_file_map,
                chapter_blocks=chapter_blocks,
                chapter_element_ids=chapter_element_ids
            )
            toc_tree = native_toc_tree if native_toc_tree else fallback_toc_tree
        else:
            toc_tree = fallback_toc_tree

        return toc_tree, chapter_blocks

    def _build_raw_toc_items(self, toc_items, level: int = 1) -> List[_RawTocItem]:
        """从 EPUB 原生 book.toc 中提取原始层次节点 (不直接构造 Pydantic 模型)"""
        items: List[_RawTocItem] = []
        if not toc_items:
            return items

        for item in toc_items:
            if isinstance(item, (list, tuple)):
                if len(item) == 2:
                    header, sub_items = item[0], item[1]
                    title = getattr(header, 'title', '').strip() if hasattr(header, 'title') and header.title else "章节"
                    href = getattr(header, 'href', None)

                    sub_raw_items = self._build_raw_toc_items(sub_items, level=level + 1)
                    items.append(_RawTocItem(
                        title=title,
                        href=href,
                        level=level,
                        children=sub_raw_items
                    ))
                else:
                    items.extend(self._build_raw_toc_items(item, level=level))

            elif hasattr(item, 'title'):
                title = item.title.strip() if item.title else ""
                href = getattr(item, 'href', None)
                if title:
                    items.append(_RawTocItem(
                        title=title,
                        href=href,
                        level=level,
                        children=[]
                    ))

        return items

    def _build_toc_tree_from_raw(
        self,
        raw_items: List[_RawTocItem],
        chapter_file_map: Dict[str, str],
        chapter_blocks: Dict[str, List[ContentBlock]],
        chapter_element_ids: Dict[str, Dict[str, str]],
        prefix: str = "toc_n"
    ) -> List[TocNode]:
        """将原始 _RawTocItem 绑定坐标并直接一次性构造不可变的 TocNode 节点列表"""
        nodes: List[TocNode] = []

        for idx, item in enumerate(raw_items):
            node_id = f"{prefix}_{item.level}_{idx+1}"
            target_chap_id = ""
            target_block_id = ""

            if item.href:
                file_part = item.href.split('#')[0].lower()
                anchor_part = item.href.split('#')[1] if '#' in item.href else None

                matched_chap_id = chapter_file_map.get(file_part) or chapter_file_map.get(os.path.basename(file_part))
                if matched_chap_id and matched_chap_id in chapter_blocks:
                    target_chap_id = matched_chap_id
                    
                    block_id = None
                    if anchor_part and target_chap_id in chapter_element_ids:
                        block_id = chapter_element_ids[target_chap_id].get(anchor_part)

                    if not block_id:
                        blocks = chapter_blocks[target_chap_id]
                        block_id = blocks[0].block_id if blocks else ""

                    target_block_id = block_id or ""

            child_nodes = self._build_toc_tree_from_raw(
                raw_items=item.children,
                chapter_file_map=chapter_file_map,
                chapter_blocks=chapter_blocks,
                chapter_element_ids=chapter_element_ids,
                prefix=node_id
            )

            nodes.append(TocNode(
                id=node_id,
                title=item.title,
                level=item.level,
                target_chapter_id=target_chap_id,
                target_block_id=target_block_id if target_block_id else None,
                children=child_nodes
            ))

        return nodes


    def _is_toc_or_nav_item(self, book, item, soup) -> bool:
        """根据 EPUB 规范与 DOM 特征识别是否为目录/导航专用页面"""
        import os

        properties = getattr(item, 'properties', []) or []
        if 'nav' in properties:
            return True

        name = (item.get_name() or "").lower()
        filename = os.path.basename(name)
        filename_without_ext = os.path.splitext(filename)[0]

        exact_toc_names = {'toc', 'nav', 'contents', 'table_of_contents', 'toc_page', 'nav_page'}
        if filename_without_ext in exact_toc_names or filename in {'toc.xhtml', 'nav.xhtml', 'toc.html', 'nav.html'}:
            return True

        toc_nav = soup.find('nav', attrs={'epub:type': 'toc'}) or soup.find('nav', attrs={'role': 'doc-toc'})
        if toc_nav:
            return True

        headings = soup.find_all(['h1', 'h2', 'h3'])
        for h in headings:
            h_text = h.get_text().strip().lower()
            if h_text in {'table of contents', 'contents', '目录', '本书目录'}:
                anchors = soup.find_all('a')
                if len(anchors) >= 3:
                    return True

        return False

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

        a_tag = el.find('a')
        if a_tag and a_tag.get('href'):
            href = a_tag.get('href')
            if '#' in href or href.endswith(('.xhtml', '.html', '.htm')):
                el_text = text.strip()
                a_text = a_tag.get_text().strip()
                if el_text == a_text:
                    return False, 1

        if tag_name.startswith('h') and len(tag_name) == 2 and tag_name[1].isdigit():
            level = int(tag_name[1])
            return True, level

        el_id = el.get('id', '')
        if el_id and el_id in toc_anchors:
            return True, 2

        if text in toc_titles and len(text) <= 80:
            return True, 2

        if tag_name == 'p':
            el_classes = ' '.join(el.get('class', [])) if el.get('class') else ''
            
            has_bold_tag = bool(el.find(['b', 'strong']))
            has_bold_class = any(k in el_classes.lower() for k in ['bold', 'title', 'heading', 'chap'])
            has_child_bold_class = bool(el.find(class_=lambda c: c and any(k in str(c).lower() for k in ['bold', 'title', 'heading'])))

            is_styled_heading = has_bold_tag or has_bold_class or has_child_bold_class

            is_short_text = len(text) <= 60
            not_ending_punctuation = not text.endswith(('。', '；', '?', '!', '.', ';'))

            if is_styled_heading and is_short_text and not_ending_punctuation:
                return True, 2

        return False, 1



