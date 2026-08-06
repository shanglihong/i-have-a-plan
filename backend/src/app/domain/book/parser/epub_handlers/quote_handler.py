from typing import Tuple, Optional, Set, Dict, Any, List, Union
from ebooklib import epub
from app.domain.book.entities import ContentBlock, BlockType
from app.domain.book.parser.epub_handlers.base import IElementHandler


from app.domain.book.parser.epub_handlers.image_handler import ImageElementHandler


class QuoteElementHandler(IElementHandler):
    """引用块 (blockquote) 节点解析策略"""

    def __init__(self, image_handler: Optional[ImageElementHandler] = None):
        self.image_handler = image_handler or ImageElementHandler()

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
        if not images:
            text = self._extract_node_text(el)
            if not text:
                return None, "", ""

            b_id = f"b_{chap_id}_{seq:03d}"
            el_id = el.get('id', '')

            md_lines = [f"> {line}" for line in text.splitlines() if line.strip()]
            markdown_quote = "\n>\n".join(md_lines)

            block = ContentBlock(
                block_id=b_id,
                block_type=BlockType.QUOTE,
                sequence_index=seq,
                text=text,
                html_or_markdown=markdown_quote
            )
            return block, b_id, el_id

        # 当内部穿插图片时，直接复用 self.image_handler 的解析逻辑按图文顺序切分
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
            md_lines = [f"> {line}" for line in text_content.splitlines() if line.strip()]
            markdown_quote = "\n>\n".join(md_lines)
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
                    results.append((img_block, b_id, el_id))
                    current_seq += 1
            elif c_name in ('figure', 'svg'):
                flush_text_buffer()
                img_child = child.find(['img', 'image'])
                if img_child:
                    img_block, b_id, el_id = self.image_handler.parse(img_child, item, chap_id, current_seq, context)
                    if img_block:
                        results.append((img_block, b_id, el_id))
                        current_seq += 1
            elif c_name == 'figcaption':
                # 显式识别图注节点，跳过防止泄露到引用文本中
                continue
            elif c_name:
                sub_imgs = child.find_all(['img', 'image'])
                if not sub_imgs:
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
                                results.append((img_block, b_id, el_id))
                                current_seq += 1
                        elif n_name == 'figcaption':
                            continue
                        elif isinstance(node, str) and node.parent and getattr(node.parent, 'name', None) not in ('img', 'image', 'figcaption', 'figure'):
                            if node.strip():
                                current_text_buf.append(str(node).strip())
            elif isinstance(child, str):
                if child.strip():
                    current_text_buf.append(child.strip())

        flush_text_buffer()
        return results

    def _extract_node_text(self, el) -> str:
        """提取 DOM 节点的文本内容，自动过滤图注节点 (figcaption)，若包含 li 则格式化前缀"""
        if getattr(el, 'name', None) == 'figcaption':
            return ""

        lis = el.find_all('li') if hasattr(el, 'find_all') else []
        if not lis and getattr(el, 'name', None) != 'li':
            return el.get_text(separator="\n", strip=True) if hasattr(el, 'get_text') else str(el).strip()

        lines = []
        if getattr(el, 'name', None) == 'li':
            lines.append(self._format_li_item(el))
        elif hasattr(el, 'children'):
            for child in el.children:
                c_name = getattr(child, 'name', None)
                if c_name == 'figcaption':
                    continue
                if c_name in ('ul', 'ol'):
                    for li in child.find_all('li', recursive=False):
                        lines.append(self._format_li_item(li))
                elif c_name == 'li':
                    lines.append(self._format_li_item(child))
                elif c_name:
                    lines.append(child.get_text(separator="\n", strip=True))
                elif isinstance(child, str) and child.strip():
                    lines.append(child.strip())

        return "\n".join([line for line in lines if line.strip()])

    def _format_li_item(self, li_el) -> str:
        raw_text = li_el.get_text(strip=True) if hasattr(li_el, 'get_text') else str(li_el).strip()
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
