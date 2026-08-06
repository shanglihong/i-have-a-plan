from typing import Tuple, Optional, Set, Dict, Any, List, Union
from ebooklib import epub
from app.domain.book.entities import ContentBlock, BlockType
from app.domain.book.parser.epub_handlers.base import IElementHandler
from app.domain.book.parser.epub_handlers.image_handler import ImageElementHandler
from app.domain.book.parser.epub_handlers.table_handler import TableElementHandler
from app.domain.book.parser.epub_handlers.list_handler import ListElementHandler
from app.domain.book.parser.epub_handlers.code_handler import CodeElementHandler


class QuoteElementHandler(IElementHandler):
    """引用块 (blockquote) 节点解析策略"""

    def __init__(
        self,
        image_handler: Optional[ImageElementHandler] = None,
        table_handler: Optional[TableElementHandler] = None,
        list_handler: Optional[ListElementHandler] = None,
        code_handler: Optional[CodeElementHandler] = None
    ):
        self.image_handler = image_handler or ImageElementHandler()
        self.table_handler = table_handler or TableElementHandler()
        self.list_handler = list_handler or ListElementHandler()
        self.code_handler = code_handler or CodeElementHandler()

    @property
    def supported_tags(self) -> Set[str]:
        return {'blockquote', 'aside'}

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
    ) -> Union[Tuple[Optional[ContentBlock], str, str], List[Tuple[Optional[ContentBlock], str, str]]]:
        images = el.find_all(['img', 'image'])
        tables = el.find_all('table')
        lists = el.find_all(['ul', 'ol'])
        pres = el.find_all('pre')
        if not images and not tables and not lists and not pres:
            text = self._extract_node_text(el)
            if not text:
                return None, "", ""

            b_id = f"b_{chap_id}_{seq:03d}"
            el_id = el.get('id', '')

            markdown_quote = self._build_markdown_quote(text)

            block = ContentBlock(
                block_id=b_id,
                block_type=BlockType.QUOTE,
                sequence_index=seq,
                text=text,
                html_or_markdown=markdown_quote
            )
            return block, b_id, el_id

        # 当内部穿插图片、表格、列表或代码块(pre)时，按 DOM 顺序切分
        results: List[Tuple[Optional[ContentBlock], str, str]] = []
        current_seq = seq

        current_text_buf: List[str] = []

        def flush_text_buffer():
            nonlocal current_seq
            text_content = "\n".join([t.strip() for t in current_text_buf if t.strip()])
            current_text_buf.clear()
            if not text_content:
                return
            b_id = f"b_{chap_id}_{current_seq:03d}"
            markdown_quote = self._build_markdown_quote(text_content)
            block = ContentBlock(
                block_id=b_id,
                block_type=BlockType.QUOTE,
                sequence_index=current_seq,
                text=text_content,
                html_or_markdown=markdown_quote
            )
            results.append((block, b_id, el.get('id', '')))
            current_seq += 1

        for child in el.children:
            c_name = getattr(child, 'name', None)
            if c_name in ('img', 'image'):
                flush_text_buffer()
                img_block, b_id, el_id = self.image_handler.parse(child, item, chap_id, current_seq, context)
                if img_block:
                    quote_img_block = ContentBlock(
                        block_id=img_block.block_id,
                        block_type=BlockType.QUOTE_IMAGE,
                        sequence_index=img_block.sequence_index,
                        text=img_block.text,
                        html_or_markdown=img_block.html_or_markdown,
                        page_number=img_block.page_number,
                        bbox=img_block.bbox
                    )
                    results.append((quote_img_block, b_id, el_id))
                    current_seq += 1
            elif c_name == 'table':
                flush_text_buffer()
                tbl_block, b_id, el_id = self.table_handler.parse(child, item, chap_id, current_seq, context)
                if tbl_block:
                    quote_tbl_block = ContentBlock(
                        block_id=tbl_block.block_id,
                        block_type=BlockType.QUOTE_TABLE,
                        sequence_index=tbl_block.sequence_index,
                        text=tbl_block.text,
                        html_or_markdown=tbl_block.html_or_markdown,
                        page_number=tbl_block.page_number,
                        bbox=tbl_block.bbox
                    )
                    results.append((quote_tbl_block, b_id, el_id))
                    current_seq += 1
            elif c_name in ('ul', 'ol'):
                flush_text_buffer()
                lst_block, b_id, el_id = self.list_handler.parse(child, item, chap_id, current_seq, context)
                if lst_block:
                    quote_lst_block = ContentBlock(
                        block_id=lst_block.block_id,
                        block_type=BlockType.QUOTE_LIST,
                        sequence_index=lst_block.sequence_index,
                        text=lst_block.text,
                        html_or_markdown=lst_block.html_or_markdown,
                        page_number=lst_block.page_number,
                        bbox=lst_block.bbox
                    )
                    results.append((quote_lst_block, b_id, el_id))
                    current_seq += 1
            elif c_name == 'pre':
                flush_text_buffer()
                code_block, b_id, el_id = self.code_handler.parse(child, item, chap_id, current_seq, context)
                if code_block:
                    quote_code_block = ContentBlock(
                        block_id=code_block.block_id,
                        block_type=BlockType.QUOTE_CODE,
                        sequence_index=code_block.sequence_index,
                        text=code_block.text,
                        html_or_markdown=code_block.html_or_markdown,
                        page_number=code_block.page_number,
                        bbox=code_block.bbox
                    )
                    results.append((quote_code_block, b_id, el_id))
                    current_seq += 1
            elif c_name in ('figure', 'svg'):
                flush_text_buffer()
                img_child = child.find(['img', 'image'])
                if img_child:
                    img_block, b_id, el_id = self.image_handler.parse(img_child, item, chap_id, current_seq, context)
                    if img_block:
                        quote_img_block = ContentBlock(
                            block_id=img_block.block_id,
                            block_type=BlockType.QUOTE_IMAGE,
                            sequence_index=img_block.sequence_index,
                            text=img_block.text,
                            html_or_markdown=img_block.html_or_markdown,
                            page_number=img_block.page_number,
                            bbox=img_block.bbox
                        )
                        results.append((quote_img_block, b_id, el_id))
                        current_seq += 1
            elif c_name == 'figcaption':
                # 显式识别图注节点，跳过防止泄露到引用文本中
                continue
            elif c_name:
                sub_imgs = child.find_all(['img', 'image'])
                sub_tbls = child.find_all('table')
                sub_lsts = child.find_all(['ul', 'ol'])
                sub_pres = child.find_all('pre')
                if not sub_imgs and not sub_tbls and not sub_lsts and not sub_pres:
                    formatted_text = self._extract_node_text(child)
                    if formatted_text:
                        current_text_buf.append(formatted_text)
                else:
                    for node in child.descendants:
                        n_name = getattr(node, 'name', None)
                        if n_name in ('img', 'image'):
                            flush_text_buffer()
                            img_block, b_id, el_id = self.image_handler.parse(node, item, chap_id, current_seq, context)
                            if img_block:
                                quote_img_block = ContentBlock(
                                    block_id=img_block.block_id,
                                    block_type=BlockType.QUOTE_IMAGE,
                                    sequence_index=img_block.sequence_index,
                                    text=img_block.text,
                                    html_or_markdown=img_block.html_or_markdown,
                                    page_number=img_block.page_number,
                                    bbox=img_block.bbox
                                )
                                results.append((quote_img_block, b_id, el_id))
                                current_seq += 1
                        elif n_name == 'table':
                            flush_text_buffer()
                            tbl_block, b_id, el_id = self.table_handler.parse(node, item, chap_id, current_seq, context)
                            if tbl_block:
                                quote_tbl_block = ContentBlock(
                                    block_id=tbl_block.block_id,
                                    block_type=BlockType.QUOTE_TABLE,
                                    sequence_index=tbl_block.sequence_index,
                                    text=tbl_block.text,
                                    html_or_markdown=tbl_block.html_or_markdown,
                                    page_number=tbl_block.page_number,
                                    bbox=tbl_block.bbox
                                )
                                results.append((quote_tbl_block, b_id, el_id))
                                current_seq += 1
                        elif n_name in ('ul', 'ol'):
                            flush_text_buffer()
                            lst_block, b_id, el_id = self.list_handler.parse(node, item, chap_id, current_seq, context)
                            if lst_block:
                                quote_lst_block = ContentBlock(
                                    block_id=lst_block.block_id,
                                    block_type=BlockType.QUOTE_LIST,
                                    sequence_index=lst_block.sequence_index,
                                    text=lst_block.text,
                                    html_or_markdown=lst_block.html_or_markdown,
                                    page_number=lst_block.page_number,
                                    bbox=lst_block.bbox
                                )
                                results.append((quote_lst_block, b_id, el_id))
                                current_seq += 1
                        elif n_name == 'pre':
                            flush_text_buffer()
                            code_block, b_id, el_id = self.code_handler.parse(node, item, chap_id, current_seq, context)
                            if code_block:
                                quote_code_block = ContentBlock(
                                    block_id=code_block.block_id,
                                    block_type=BlockType.QUOTE_CODE,
                                    sequence_index=code_block.sequence_index,
                                    text=code_block.text,
                                    html_or_markdown=code_block.html_or_markdown,
                                    page_number=code_block.page_number,
                                    bbox=code_block.bbox
                                )
                                results.append((quote_code_block, b_id, el_id))
                                current_seq += 1
                        elif n_name == 'figcaption':
                            continue
                        elif isinstance(node, str) and node.parent and getattr(node.parent, 'name', None) not in ('img', 'image', 'figcaption', 'figure', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'pre'):
                            if node.strip():
                                current_text_buf.append(str(node).strip())
            elif isinstance(child, str):
                if child.strip():
                    current_text_buf.append(child.strip())


        flush_text_buffer()
        return results

    def _extract_node_text(self, el) -> str:
        """提取 DOM 节点的文本内容，自动过滤图注节点 (figcaption)，若包含 li、pre/code/b/strong 或 table 则格式化"""
        if getattr(el, 'name', None) == 'figcaption':
            return ""

        if getattr(el, 'name', None) == 'pre':
            code_text = el.get_text().strip() if hasattr(el, 'get_text') else str(el).strip()
            return f"```\n{code_text}\n```"

        if getattr(el, 'name', None) == 'code':
            code_text = el.get_text().strip() if hasattr(el, 'get_text') else str(el).strip()
            return f"`{code_text}`" if code_text else ""

        if getattr(el, 'name', None) in ('b', 'strong'):
            b_text = el.get_text().strip() if hasattr(el, 'get_text') else str(el).strip()
            return f"**{b_text}**" if b_text else ""

        if getattr(el, 'name', None) == 'table':
            tbl_block, _, _ = self.table_handler.parse(el, None, "temp", 0)
            return tbl_block.html_or_markdown if tbl_block else el.get_text(separator=" ", strip=True)

        if getattr(el, 'name', None) in ('ul', 'ol'):
            lines = [self._format_li_item(li) for li in el.find_all('li', recursive=False)]
            return "\n".join([line for line in lines if line.strip()])

        lis = el.find_all('li') if hasattr(el, 'find_all') else []
        pres = el.find_all('pre') if hasattr(el, 'find_all') else []
        codes = el.find_all('code') if hasattr(el, 'find_all') else []
        bolds = el.find_all(['b', 'strong']) if hasattr(el, 'find_all') else []
        if not lis and not pres and not codes and not bolds and getattr(el, 'name', None) not in ('ul', 'ol', 'li', 'pre', 'code', 'b', 'strong'):
            return el.get_text(strip=True) if hasattr(el, 'get_text') else str(el).strip()

        if getattr(el, 'name', None) == 'li':
            return self._format_li_item(el)

        # 当不包含块级 pre 和 li，但包含行内 code 或 b/strong 加粗时，执行行内平滑文本拼接
        if not lis and not pres and (codes or bolds):
            buf = []
            if hasattr(el, 'children'):
                for child in el.children:
                    c_name = getattr(child, 'name', None)
                    if c_name == 'code':
                        c_text = child.get_text().strip()
                        if c_text:
                            buf.append(f"`{c_text}`")
                    elif c_name in ('b', 'strong'):
                        b_text = child.get_text().strip()
                        if b_text:
                            buf.append(f"**{b_text}**")
                    elif c_name == 'figcaption':
                        continue
                    elif c_name:
                        buf.append(self._extract_node_text(child))
                    elif isinstance(child, str):
                        buf.append(str(child))
            return "".join(buf).strip()

        lines = []
        if getattr(el, 'name', None) == 'pre':
            code_text = el.get_text().strip() if hasattr(el, 'get_text') else str(el).strip()
            lines.append(f"```\n{code_text}\n```")
        elif getattr(el, 'name', None) == 'code':
            code_text = el.get_text().strip() if hasattr(el, 'get_text') else str(el).strip()
            lines.append(f"`{code_text}`")
        elif getattr(el, 'name', None) in ('b', 'strong'):
            b_text = el.get_text().strip() if hasattr(el, 'get_text') else str(el).strip()
            lines.append(f"**{b_text}**")
        elif hasattr(el, 'children'):
            for child in el.children:
                c_name = getattr(child, 'name', None)
                if c_name == 'figcaption':
                    continue
                if c_name == 'pre':
                    code_text = child.get_text().strip() if hasattr(child, 'get_text') else str(child).strip()
                    lines.append(f"```\n{code_text}\n```")
                elif c_name == 'code':
                    code_text = child.get_text().strip() if hasattr(child, 'get_text') else str(child).strip()
                    lines.append(f"`{code_text}`")
                elif c_name in ('b', 'strong'):
                    b_text = child.get_text().strip() if hasattr(child, 'get_text') else str(child).strip()
                    lines.append(f"**{b_text}**")
                elif c_name in ('ul', 'ol'):
                    for li in child.find_all('li', recursive=False):
                        lines.append(self._format_li_item(li))
                elif c_name == 'li':
                    lines.append(self._format_li_item(child))
                elif c_name:
                    sub_pres = child.find_all('pre') if hasattr(child, 'find_all') else []
                    sub_codes = child.find_all('code') if hasattr(child, 'find_all') else []
                    sub_bolds = child.find_all(['b', 'strong']) if hasattr(child, 'find_all') else []
                    if sub_pres or sub_codes or sub_bolds or c_name in ('pre', 'code', 'b', 'strong'):
                        lines.append(self._extract_node_text(child))
                    else:
                        lines.append(child.get_text(strip=True))
                elif isinstance(child, str) and child.strip():
                    lines.append(child.strip())

        return "\n".join([line for line in lines if line.strip()])

    def _build_markdown_quote(self, text: str) -> str:
        """根据包含普通段落与代码块的文本构建合规的 Markdown 引用语法"""
        lines = text.splitlines()
        if not lines:
            return ""

        chunks = []
        in_code_block = False
        current_chunk = []

        for line in lines:
            stripped = line.strip()
            if not stripped and not in_code_block:
                continue

            if stripped.startswith("```"):
                if not in_code_block:
                    if current_chunk:
                        chunks.append("> " + "\n>\n> ".join(current_chunk))
                        current_chunk = []
                    in_code_block = True
                    current_chunk.append(line)
                else:
                    current_chunk.append(line)
                    chunks.append("\n".join([f"> {l}" if l.strip() else ">" for l in current_chunk]))
                    current_chunk = []
                    in_code_block = False
            else:
                if in_code_block:
                    current_chunk.append(line)
                else:
                    if stripped:
                        current_chunk.append(stripped)

        if current_chunk:
            if in_code_block:
                chunks.append("\n".join([f"> {l}" if l.strip() else ">" for l in current_chunk]))
            else:
                chunks.append("> " + "\n>\n> ".join(current_chunk))

        return "\n>\n".join(chunks)

    def _format_li_item(self, li_el) -> str:
        if not hasattr(li_el, 'get_text'):
            raw_text = str(li_el).strip()
        elif li_el.find(['code', 'b', 'strong']):
            buf = []
            for child in li_el.children:
                c_name = getattr(child, 'name', None)
                if c_name == 'code':
                    c_text = child.get_text().strip()
                    if c_text:
                        buf.append(f"`{c_text}`")
                elif c_name in ('b', 'strong'):
                    b_text = child.get_text().strip()
                    if b_text:
                        buf.append(f"**{b_text}**")
                elif c_name:
                    buf.append(child.get_text(strip=True))
                elif isinstance(child, str):
                    buf.append(str(child))
            raw_text = "".join(buf).strip()
        else:
            raw_text = li_el.get_text(strip=True)

        if not raw_text:
            return ""
        parent_ol = li_el.find_parent('ol') if hasattr(li_el, 'find_parent') else None
        if parent_ol:
            if hasattr(li_el, 'has_attr') and li_el.has_attr('value') and str(li_el['value']).isdigit():
                idx = int(li_el['value'])
            else:
                sibling_lis = parent_ol.find_all('li', recursive=False)
                idx = sibling_lis.index(li_el) + 1 if li_el in sibling_lis else 1
            prefix = f"{idx}."
        else:
            prefix = "•"
        return f"{prefix} {raw_text}"

