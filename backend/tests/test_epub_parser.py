import pytest
from unittest.mock import MagicMock, patch
from app.domain.book.parser.epub_parser import EpubParser
from app.domain.book.entities import BlockType, TocNode


def create_mock_item(name, content, properties=None, item_type=None):
    import ebooklib
    item = MagicMock()
    item.get_name.return_value = name
    item.get_content.return_value = content.encode('utf-8')
    item.properties = properties or []
    item.get_type.return_value = item_type if item_type is not None else ebooklib.ITEM_DOCUMENT
    return item


def test_epub_parser_native_toc_hierarchy():
    parser = EpubParser()

    toc_item = create_mock_item(
        name="OEBPS/toc.xhtml",
        content="""<html><body>
        <h1>Table of Contents</h1>
        <p><a href="chap1.xhtml">第一章 乡土本色</a></p>
        </body></html>""",
        properties=['nav']
    )

    chap1_item = create_mock_item(
        name="OEBPS/chap1.xhtml",
        content="""<html><body>
        <h1 id="sec1">第一章 乡土本色</h1>
        <p>乡土中国是老一代人的生活记忆。</p>
        </body></html>"""
    )

    mock_toc_link = MagicMock()
    mock_toc_link.title = "第一章 乡土本色"
    mock_toc_link.href = "OEBPS/chap1.xhtml#sec1"

    mock_book = MagicMock()
    mock_book.toc = [mock_toc_link]
    mock_book.spine = [('toc_id', 'no'), ('chap1_id', 'yes')]

    def get_item_by_id(item_id):
        if item_id == 'toc_id':
            return toc_item
        if item_id == 'chap1_id':
            return chap1_item
        return None

    mock_book.get_item_with_id.side_effect = get_item_by_id
    mock_book.get_items_of_type.return_value = [toc_item, chap1_item]

    with patch('ebooklib.epub.read_epub', return_value=mock_book):
        toc_tree, chapter_blocks = parser.parse("dummy.epub")

    # 验证目录页被跳过
    assert len(chapter_blocks) == 1
    assert "chap_01" in chapter_blocks

    # 验证原生的 toc_tree 正常提取并成功绑定到 chap_01 的 ID 锚点上，且序列化校验无错
    assert len(toc_tree) == 1
    assert toc_tree[0].title == "第一章 乡土本色"
    assert toc_tree[0].target_chapter_id == "chap_01"
    assert toc_tree[0].target_block_id == "b_chap_01_001"

    # 测试 model_validate 反序列化无异常
    dict_data = toc_tree[0].to_dict()
    revalidated_node = TocNode.from_dict(dict_data)
    assert revalidated_node.title == "第一章 乡土本色"


def test_is_heading_element_excludes_pure_link_entry():
    from bs4 import BeautifulSoup
    parser = EpubParser()
    soup = BeautifulSoup('<p><a href="chap1.xhtml">第一章 乡土本色</a></p>', 'html.parser')
    p_el = soup.find('p')

    is_heading, level = parser._is_heading_element(
        el=p_el,
        text="第一章 乡土本色",
        toc_titles={"第一章 乡土本色"},
        toc_anchors=set()
    )

    # 纯外部跳转链接条目不应当判定为 Heading
    assert is_heading is False
