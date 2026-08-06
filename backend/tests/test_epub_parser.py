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


def test_epub_parser_image_extraction():
    parser = EpubParser()

    chap_with_image = create_mock_item(
        name="OEBPS/chap2.xhtml",
        content="""<html><body>
        <h1>第二章 文字插图</h1>
        <p>下面是一张插入的插图：</p>
        <p><img src="images/illustration.png" alt="乡土插图" id="img_01" /></p>
        <figure>
            <img src="images/figure.jpg" />
            <figcaption>示意图说明</figcaption>
        </figure>
        </body></html>"""
    )

    mock_book = MagicMock()
    mock_book.toc = []
    mock_book.spine = [('chap2_id', 'yes')]
    mock_book.get_item_with_id.side_effect = lambda item_id: chap_with_image if item_id == 'chap2_id' else None
    mock_book.get_items_of_type.return_value = [chap_with_image]

    with patch('ebooklib.epub.read_epub', return_value=mock_book):
        toc_tree, chapter_blocks = parser.parse("dummy.epub")

    assert "chap_01" in chapter_blocks
    blocks = chapter_blocks["chap_01"]

    image_blocks = [b for b in blocks if b.block_type == BlockType.IMAGE]
    assert len(image_blocks) == 2

    # 校验第一个图片块
    assert image_blocks[0].text == "乡土插图"
    assert 'src="images/illustration.png"' in image_blocks[0].html_or_markdown

    # 校验第二个图片块（从 parent figure > figcaption 提取 alt）
    assert image_blocks[1].text == "示意图说明"
    assert 'src="images/figure.jpg"' in image_blocks[1].html_or_markdown


def test_epub_parser_cover_item_extraction():
    import ebooklib
    parser = EpubParser()

    # 测试纯二进制 ITEM_COVER
    cover_binary_item = MagicMock()
    cover_binary_item.get_name.return_value = "cover.jpg"
    cover_binary_item.get_content.return_value = b"\xff\xd8\xff\xe0\x00\x10JFIF"
    cover_binary_item.properties = []
    cover_binary_item.get_type.return_value = ebooklib.ITEM_COVER

    mock_book = MagicMock()
    mock_book.toc = []
    mock_book.spine = []
    mock_book.get_items_of_type.side_effect = lambda t: [cover_binary_item] if t == ebooklib.ITEM_COVER else []

    with patch('ebooklib.epub.read_epub', return_value=mock_book):
        toc_tree, chapter_blocks = parser.parse("dummy.epub")

    assert "chap_01" in chapter_blocks
    cover_block = chapter_blocks["chap_01"][0]
    assert cover_block.block_type == BlockType.IMAGE
    assert cover_block.text == "封面"
    assert 'src="cover.jpg"' in cover_block.html_or_markdown


def test_epub_parser_table_and_code_extraction():
    parser = EpubParser()

    chap_with_table_and_code = create_mock_item(
        name="OEBPS/chap3.xhtml",
        content="""<html><body>
        <h1>第三章 技术文档</h1>
        <p>下面是一个表格：</p>
        <table>
            <tr><th>名称</th><th>语言</th></tr>
            <tr><td>后端策略</td><td>Python</td></tr>
        </table>
        <p>下面是一段 Python 代码：</p>
        <pre class="language-python"><code>def parse_book():
    print("hello")</code></pre>
        </body></html>"""
    )

    mock_book = MagicMock()
    mock_book.toc = []
    mock_book.spine = [('chap3_id', 'yes')]
    mock_book.get_item_with_id.side_effect = lambda item_id: chap_with_table_and_code if item_id == 'chap3_id' else None
    mock_book.get_items_of_type.return_value = [chap_with_table_and_code]

    with patch('ebooklib.epub.read_epub', return_value=mock_book):
        toc_tree, chapter_blocks = parser.parse("dummy.epub")

    assert "chap_01" in chapter_blocks
    blocks = chapter_blocks["chap_01"]

    # 包含：标题(1), 段落(2), 表格(3), 段落(4), 代码块(5)
    table_blocks = [b for b in blocks if b.block_type == BlockType.TABLE]
    code_blocks = [b for b in blocks if b.block_type == BlockType.CODE]

    assert len(table_blocks) == 1
    assert "| 名称 | 语言 |" in table_blocks[0].html_or_markdown
    assert "| 后端策略 | Python |" in table_blocks[0].html_or_markdown

    assert len(code_blocks) == 1
    assert "```python" in code_blocks[0].html_or_markdown
    assert "def parse_book():" in code_blocks[0].text


