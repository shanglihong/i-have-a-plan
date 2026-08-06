import ebooklib
import os
from typing import List, Dict, Tuple, Set, Optional
from dataclasses import dataclass, field
from bs4 import BeautifulSoup
from ebooklib import epub
from app.domain.book.entities import TocNode, ContentBlock, BlockType
from app.domain.book.parser.base import IBookParser
from app.domain.book.parser.epub_handlers import ElementHandlerRegistry


@dataclass
class _RawTocItem:
    title: str
    href: Optional[str]
    level: int
    children: List["_RawTocItem"] = field(default_factory=list)


class EpubParser(IBookParser):
    """EPUB 专业解析策略（参考 Readium / Foliate 工业级实现）"""

    def __init__(self, registry: Optional[ElementHandlerRegistry] = None):
        self.registry = registry or ElementHandlerRegistry()

    def parse(self, file_path: str) -> Tuple[List[TocNode], Dict[str, List[ContentBlock]]]:
        """EPUB 文件解析主入口编排"""
        book = self._load_epub(file_path)
        document_items = self._collect_document_items(book)

        chapter_blocks, chapter_file_map, chapter_element_ids = self._parse_all_chapters(book, document_items)

        toc_tree = self._build_toc_tree(book, chapter_file_map, chapter_blocks, chapter_element_ids)

        return toc_tree, chapter_blocks

    # ----------------------------------------------------------------------
    # 核心解析步骤方法 (Step Methods)
    # ----------------------------------------------------------------------

    def _load_epub(self, file_path: str) -> epub.EpubBook:
        """安全加载 EPUB 文件"""
        try:
            return epub.read_epub(file_path)
        except Exception as e:
            raise ValueError(f"EPUB 文件损坏或解析流意外中断: {str(e)}") from e

    def _collect_document_items(self, book: epub.EpubBook) -> List[epub.EpubItem]:
        """依据 EPUB Spine 规范建立主阅读流 Document 顺序，并补全封面项"""
        document_items: List[epub.EpubItem] = []
        for entry in getattr(book, 'spine', []):
            item_id = entry[0] if isinstance(entry, (tuple, list)) else entry
            linear = entry[1] if isinstance(entry, (tuple, list)) and len(entry) > 1 else 'yes'
            if str(linear).lower() in ('no', 'false', '0'):
                continue
            if (item := book.get_item_with_id(item_id)) and item.get_type() in (ebooklib.ITEM_DOCUMENT, ebooklib.ITEM_COVER):
                document_items.append(item)

        if not document_items:
            raise ValueError("EPUB 文件未包含有效的可阅读文档内容")

        # 补全可能不在 spine 中的 ITEM_COVER
        cover_items = list(book.get_items_of_type(ebooklib.ITEM_COVER))
        for cov in cover_items:
            if cov not in document_items:
                document_items.insert(0, cov)

        return document_items

    def _parse_all_chapters(
        self,
        book: epub.EpubBook,
        document_items: List[epub.EpubItem]
    ) -> Tuple[Dict[str, List[ContentBlock]], Dict[str, str], Dict[str, Dict[str, str]]]:
        """遍历所有文档项并解析提取章节内容块及 ID 映射关系"""
        chap_counter = 0
        chapter_blocks: Dict[str, List[ContentBlock]] = {}
        chapter_file_map: Dict[str, str] = {}
        chapter_element_ids: Dict[str, Dict[str, str]] = {}

        toc_titles, toc_anchors = self._extract_toc_info(book.toc)

        for item in document_items:
            content = item.get_content()

            # 1. 独立处理纯二进制图片格式的 ITEM_COVER
            if item.get_type() == ebooklib.ITEM_COVER and not content.lstrip().startswith(b'<'):
                chap_counter += 1
                chap_id = f"chap_{chap_counter:02d}"
                self._record_file_mapping(chapter_file_map, item.get_name() or "cover.jpg", chap_id)

                cover_block = self._create_binary_cover_block(chap_id, item.get_name() or "cover.jpg")
                chapter_blocks[chap_id] = [cover_block]
                continue

            # 2. HTML/XHTML 页面解析
            soup = BeautifulSoup(content, 'html.parser')
            # logger.info(str(soup)) # 打印网页内容

            # 过滤 EPUB 导航/目录专用页面
            if self._is_toc_or_nav_item(book, item, soup):
                continue

            elements = soup.find_all(self.registry.supported_tags)
            if not elements:
                continue

            chap_counter += 1
            chap_id = f"chap_{chap_counter:02d}"
            self._record_file_mapping(chapter_file_map, item.get_name() or "", chap_id)

            blocks, elem_id_map = self._parse_elements_to_blocks(
                elements=elements,
                item=item,
                chap_id=chap_id,
                toc_titles=toc_titles,
                toc_anchors=toc_anchors
            )

            if blocks:
                chapter_blocks[chap_id] = blocks
                chapter_element_ids[chap_id] = elem_id_map

        return chapter_blocks, chapter_file_map, chapter_element_ids

    def _parse_elements_to_blocks(
        self,
        elements: List,
        item: epub.EpubItem,
        chap_id: str,
        toc_titles: Set[str],
        toc_anchors: Set[str]
    ) -> Tuple[List[ContentBlock], Dict[str, str]]:
        """将 DOM 元素转换为 ContentBlock 列表及 element_id -> block_id 的映射"""
        blocks: List[ContentBlock] = []
        elem_id_map: Dict[str, str] = {}
        seq = 0
        context = {
            'toc_titles': toc_titles,
            'toc_anchors': toc_anchors
        }

        for el in elements:
            parsed_results = self.registry.parse_element(
                el=el,
                item=item,
                chap_id=chap_id,
                seq=seq + 1,
                context=context
            )
            for block, b_id, el_id in parsed_results:
                if block:
                    seq += 1
                    if el_id:
                        elem_id_map[el_id] = b_id
                    blocks.append(block)

        return blocks, elem_id_map

    def _create_binary_cover_block(self, chap_id: str, item_name: str) -> ContentBlock:
        """为纯二进制图片格式的封面创建 ContentBlock"""
        b_id = f"b_{chap_id}_001"
        return ContentBlock(
            block_id=b_id,
            block_type=BlockType.IMAGE,
            sequence_index=1,
            text="封面",
            html_or_markdown=f'<img src="{item_name}" alt="封面" />'
        )

    def _record_file_mapping(self, file_map: Dict[str, str], item_name: str, chap_id: str) -> None:
        """记录文件全名及 Basename 与章节 ID 的映射"""
        name_lower = (item_name or "").lower()
        if name_lower:
            file_map[name_lower] = chap_id
            file_map[os.path.basename(name_lower)] = chap_id

    def _build_toc_tree(
        self,
        book: epub.EpubBook,
        chapter_file_map: Dict[str, str],
        chapter_blocks: Dict[str, List[ContentBlock]],
        chapter_element_ids: Dict[str, Dict[str, str]]
    ) -> List[TocNode]:
        """根据原生 book.toc 解析并构建 TocNode 目录树"""
        raw_toc_items = self._build_raw_toc_items(book.toc)
        if not raw_toc_items:
            return []

        return self._build_toc_tree_from_raw(
            raw_items=raw_toc_items,
            chapter_file_map=chapter_file_map,
            chapter_blocks=chapter_blocks,
            chapter_element_ids=chapter_element_ids
        )

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
        """判断 HTML 元素是否为标题并返回层级 (is_heading, level)
        目录严格依赖原生 book.toc 提取的信息及标准 <h1-h6> 标签，禁止从正文 p 标签自发猜想标题
        """
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



