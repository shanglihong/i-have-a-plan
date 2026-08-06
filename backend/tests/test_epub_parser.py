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


def test_epub_parser_list_and_quote_extraction():
    parser = EpubParser()

    chap_with_list_and_quote = create_mock_item(
        name="OEBPS/chap4.xhtml",
        content="""<html><body>
        <h1>第四章 列表与引用</h1>
        <ul>
            <li>无序列表项 1</li>
            <li><p>无序列表项 2 (带段落)</p></li>
        </ul>
        <ol>
            <li>有序列表项 1</li>
            <li value="5">有序列表项 5</li>
        </ol>
        <blockquote>
            <p>这是一段引用的经典名言。</p>
        </blockquote>
        <dl>
            <dt>DDD</dt>
            <dd>领域驱动设计</dd>
        </dl>
        </body></html>"""
    )

    mock_book = MagicMock()
    mock_book.toc = []
    mock_book.spine = [('chap4_id', 'yes')]
    mock_book.get_item_with_id.side_effect = lambda item_id: chap_with_list_and_quote if item_id == 'chap4_id' else None
    mock_book.get_items_of_type.return_value = [chap_with_list_and_quote]

    with patch('ebooklib.epub.read_epub', return_value=mock_book):
        toc_tree, chapter_blocks = parser.parse("dummy.epub")

    assert "chap_01" in chapter_blocks
    blocks = chapter_blocks["chap_01"]

    # 1. 验证无序列表与有序列表按 ul / ol 组块提取
    list_blocks = [b for b in blocks if b.block_type == BlockType.LIST]
    assert len(list_blocks) == 2
    assert list_blocks[0].text == "• 无序列表项 1\n• 无序列表项 2 (带段落)"
    assert list_blocks[1].text == "1 有序列表项 1\n5 有序列表项 5"

    # 2. 验证引用块提取
    quote_blocks = [b for b in blocks if b.block_type == BlockType.QUOTE]
    assert len(quote_blocks) == 1
    assert quote_blocks[0].text == "这是一段引用的经典名言。"
    assert "> 这是一段引用的经典名言。" in quote_blocks[0].html_or_markdown

    # 3. 验证定义列表提取
    dt_blocks = [b for b in blocks if "【DDD】" in b.text]
    dd_blocks = [b for b in blocks if b.text == "领域驱动设计"]
    assert len(dt_blocks) == 1
    assert len(dd_blocks) == 1

    # 4. 验证防重复拦截：p / li 标签处于 ul、ol、blockquote 内部，不应单独再生成 ContentBlock
    total_blocks_count = len(blocks)
    # 标题(1) + 无序列表块(1) + 有序列表块(1) + blockquote(1) + dt(1) + dd(1) = 6 个 blocks
    assert total_blocks_count == 6


def test_epub_parser_quote_with_embedded_image_splitting():
    parser = EpubParser()

    chap_with_quote_image = create_mock_item(
        name="OEBPS/chap5.xhtml",
        content="""<html><body>
        <h1>第五章 架构图文</h1>
        <blockquote>
            <p>这是引用上半段说明。</p>
            <img src="images/architecture.png" alt="系统架构图" />
            <p>这是引用下半段总结。</p>
        </blockquote>
        </body></html>"""
    )

    mock_book = MagicMock()
    mock_book.toc = []
    mock_book.spine = [('chap5_id', 'yes')]
    mock_book.get_item_with_id.side_effect = lambda item_id: chap_with_quote_image if item_id == 'chap5_id' else None
    mock_book.get_items_of_type.return_value = [chap_with_quote_image]

    with patch('ebooklib.epub.read_epub', return_value=mock_book):
        toc_tree, chapter_blocks = parser.parse("dummy.epub")

    assert "chap_01" in chapter_blocks
    blocks = chapter_blocks["chap_01"]

    # 包含：标题(1), QUOTE(2), IMAGE(3), QUOTE(4) 共 4 个 blocks
    assert len(blocks) == 4
    assert blocks[0].block_type == BlockType.HEADING

    assert blocks[1].block_type == BlockType.QUOTE
    assert blocks[1].text == "这是引用上半段说明。"

    assert blocks[2].block_type == BlockType.IMAGE
    assert blocks[2].text == "系统架构图"
    assert 'src="images/architecture.png"' in blocks[2].html_or_markdown

    assert blocks[3].block_type == BlockType.QUOTE
    assert blocks[3].text == "这是引用下半段总结。"


def test_epub_parser_quote_with_figure_figcaption():
    parser = EpubParser()

    chap_with_figcaption = create_mock_item(
        name="OEBPS/chap6.xhtml",
        content="""<html><body>
        <h1>第六章 图注隔离</h1>
        <blockquote>
            <p>引言正文。</p>
            <figure>
                <img src="images/agent.png" />
                <figcaption aria-hidden="true">图1-4 “模型即 Agent” 架构——原生工具调用</figcaption>
            </figure>
            <p>结语正文。</p>
        </blockquote>
        </body></html>"""
    )

    mock_book = MagicMock()
    mock_book.toc = []
    mock_book.spine = [('chap6_id', 'yes')]
    mock_book.get_item_with_id.side_effect = lambda item_id: chap_with_figcaption if item_id == 'chap6_id' else None
    mock_book.get_items_of_type.return_value = [chap_with_figcaption]

    with patch('ebooklib.epub.read_epub', return_value=mock_book):
        toc_tree, chapter_blocks = parser.parse("dummy.epub")

    assert "chap_01" in chapter_blocks
    blocks = chapter_blocks["chap_01"]

    # 包含：标题(1), QUOTE(2), IMAGE(3), QUOTE(4) 共 4 个 blocks
    assert len(blocks) == 4
    assert blocks[0].block_type == BlockType.HEADING

    assert blocks[1].block_type == BlockType.QUOTE
    assert blocks[1].text == "引言正文。"

    # 校验图注被合并为 IMAGE 块的 text 属性
    assert blocks[2].block_type == BlockType.IMAGE
    assert blocks[2].text == "图1-4 “模型即 Agent” 架构——原生工具调用"

    # 校验图注文字绝未泄露为独立的 QUOTE 块
    assert blocks[3].block_type == BlockType.QUOTE
    assert blocks[3].text == "结语正文。"


def test_epub_parser_aside_and_mathml():
    parser = EpubParser()

    chap_epub3 = create_mock_item(
        name="OEBPS/chap7.xhtml",
        content="""<html><body>
        <h1>第七章 EPUB3 高级语义</h1>
        <aside epub:type="sidebar">
            <p>这是侧边栏注解卡片内容。</p>
        </aside>
        <p>下面是一个 MathML 公式：</p>
        <math xmlns="http://www.w3.org/1998/Math/MathML">
            <mrow><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></mrow>
        </math>
        </body></html>"""
    )

    mock_book = MagicMock()
    mock_book.toc = []
    mock_book.spine = [('chap7_id', 'yes')]
    mock_book.get_item_with_id.side_effect = lambda item_id: chap_epub3 if item_id == 'chap7_id' else None
    mock_book.get_items_of_type.return_value = [chap_epub3]

    with patch('ebooklib.epub.read_epub', return_value=mock_book):
        toc_tree, chapter_blocks = parser.parse("dummy.epub")

    assert "chap_01" in chapter_blocks
    blocks = chapter_blocks["chap_01"]

    # 包含：标题(1), QUOTE(2, 来自aside), PARAGRAPH(3), CODE(4, 来自math)
    aside_blocks = [b for b in blocks if b.block_type == BlockType.QUOTE]
    math_blocks = [b for b in blocks if b.block_type == BlockType.CODE and "mathml" in b.html_or_markdown]

    assert len(aside_blocks) == 1
    assert aside_blocks[0].text == "这是侧边栏注解卡片内容。"

    assert len(math_blocks) == 1
    assert "E=mc" in math_blocks[0].text or "E" in math_blocks[0].text


def test_epub_parser_inline_code_not_split():
    parser = EpubParser()

    chap_inline_code = create_mock_item(
        name="OEBPS/chap8.xhtml",
        content="""<html><body>
        <h1>第八章 代码测试</h1>
        <p>这是包含 <code>var count = 1;</code> 的行内代码段落。</p>
        <blockquote>
            <p>引文中包含 <code>const x = 10;</code> 行内代码。</p>
        </blockquote>
        </body></html>"""
    )

    mock_book = MagicMock()
    mock_book.toc = []
    mock_book.spine = [('chap8_id', 'yes')]
    mock_book.get_item_with_id.side_effect = lambda item_id: chap_inline_code if item_id == 'chap8_id' else None
    mock_book.get_items_of_type.return_value = [chap_inline_code]

    with patch('ebooklib.epub.read_epub', return_value=mock_book):
        toc_tree, chapter_blocks = parser.parse("dummy.epub")

    assert "chap_01" in chapter_blocks
    blocks = chapter_blocks["chap_01"]

    # 块结构：标题(1) + 段落(1) + QUOTE(1) = 3个 blocks
    assert len(blocks) == 3
    assert blocks[0].block_type == BlockType.HEADING
    assert blocks[1].block_type == BlockType.PARAGRAPH
    assert "var count = 1;" in blocks[1].text
    assert "`var count = 1;`" in blocks[1].text or "var count = 1;" in blocks[1].text

    assert blocks[2].block_type == BlockType.QUOTE
    assert "const x = 10;" in blocks[2].text

    # 确认没有任何独立的 CODE 或 QUOTE_CODE 块
    code_blocks = [b for b in blocks if b.block_type in (BlockType.CODE, BlockType.QUOTE_CODE)]
    assert len(code_blocks) == 0


def test_epub_parser_quote_with_embedded_pre_code_splitting():
    parser = EpubParser()

    chap_quote_pre = create_mock_item(
        name="OEBPS/chap9.xhtml",
        content="""<html><body>
        <h1>第九章 引用内代码块</h1>
        Quote 前段:
        <blockquote>
            <p>引用前言说明。</p>
            <pre class="language-python"><code>def hello():
    print("world")</code></pre>
            <p>引用总结说明。</p>
        </blockquote>
        </body></html>"""
    )

    mock_book = MagicMock()
    mock_book.toc = []
    mock_book.spine = [('chap9_id', 'yes')]
    mock_book.get_item_with_id.side_effect = lambda item_id: chap_quote_pre if item_id == 'chap9_id' else None
    mock_book.get_items_of_type.return_value = [chap_quote_pre]

    with patch('ebooklib.epub.read_epub', return_value=mock_book):
        toc_tree, chapter_blocks = parser.parse("dummy.epub")

    assert "chap_01" in chapter_blocks
    blocks = chapter_blocks["chap_01"]

    # 包含：标题(1) + QUOTE(1) + QUOTE_CODE(1) + QUOTE(1) = 4 个 blocks
    assert len(blocks) == 4
    assert blocks[0].block_type == BlockType.HEADING
    assert blocks[1].block_type == BlockType.QUOTE
    assert blocks[1].text == "引用前言说明。"

    assert blocks[2].block_type == BlockType.QUOTE_CODE
    assert "def hello():" in blocks[2].text
    assert "```python" in blocks[2].html_or_markdown

    assert blocks[3].block_type == BlockType.QUOTE
    assert blocks[3].text == "引用总结说明。"







