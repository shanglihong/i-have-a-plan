from typing import Tuple, Optional, Set, Dict, Any
from ebooklib import epub
from app.domain.book.entities import ContentBlock, BlockType
from app.domain.book.parser.epub_handlers.base import IElementHandler


class CodeElementHandler(IElementHandler):
    """代码块 (pre) 与 MathML 公式 (math) 节点解析策略"""

    @property
    def supported_tags(self) -> Set[str]:
        return {'pre', 'math'}

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
        tag_name = el.name.lower()
        if tag_name == 'math':
            code_text = el.get_text().strip()
            if not code_text:
                return None, "", ""
            markdown_code = f"```mathml\n{str(el)}\n```"
        else:
            code_text = el.get_text().strip('\r\n')
            if not code_text.strip():
                return None, "", ""

            lang = self._extract_code_language(el)
            markdown_code = f"```{lang}\n{code_text}\n```" if lang else f"```\n{code_text}\n```"

        b_id = f"b_{chap_id}_{seq:03d}"
        el_id = el.get('id', '')

        block = ContentBlock(
            block_id=b_id,
            block_type=BlockType.CODE,
            sequence_index=seq,
            text=code_text,
            html_or_markdown=markdown_code
        )
        return block, b_id, el_id

    def _extract_code_language(self, el) -> str:
        classes = el.get('class', [])
        if isinstance(classes, str):
            classes = classes.split()

        code_child = el.find('code')
        if code_child and code_child.get('class'):
            child_cls = code_child.get('class')
            classes.extend(child_cls if isinstance(child_cls, list) else child_cls.split())

        for cls in classes:
            cls_lower = str(cls).lower()
            if cls_lower.startswith(('language-', 'lang-')):
                return cls_lower.split('-', 1)[1]
            if cls_lower.startswith('brush:'):
                return cls_lower.split(':', 1)[1].strip()
            if cls_lower in {'python', 'javascript', 'js', 'typescript', 'ts', 'go', 'golang', 'java', 'cpp', 'c', 'sql', 'html', 'css', 'json', 'bash', 'shell', 'yaml', 'xml'}:
                return cls_lower

        return ""
