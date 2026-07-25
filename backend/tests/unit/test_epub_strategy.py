"""EPUB 解析策略单元测试"""

import pytest
from bs4 import BeautifulSoup
from app.domain.book.strategies.epub_strategy import EpubParserStrategy
from app.domain.book.entities import BlockType


class TestEpubParserStrategy:

    @pytest.fixture
    def strategy(self):
        return EpubParserStrategy()

    def test_heading_detection_with_styled_bold_paragraph(self, strategy):
        html = '<p class="calibre_" id="filepos109"><span class="calibre1"><span class="bold">《乡土中国》之(1)：乡土本色</span></span></p>'
        soup = BeautifulSoup(html, 'html.parser')
        p_el = soup.find('p')
        text = p_el.get_text().strip()

        is_heading, level = strategy._is_heading_element(p_el, text, toc_titles=set(), toc_anchors=set())

        assert is_heading is True
        assert level == 2

    def test_heading_detection_with_standard_h_tags(self, strategy):
        html = '<h1>第一章 绪论</h1>'
        soup = BeautifulSoup(html, 'html.parser')
        h_el = soup.find('h1')
        text = h_el.get_text().strip()

        is_heading, level = strategy._is_heading_element(h_el, text, toc_titles=set(), toc_anchors=set())

        assert is_heading is True
        assert level == 1

    def test_normal_paragraph_not_misidentified(self, strategy):
        html = '<p class="calibre_">这是一个普通的正文段落，描述了乡土社会的特点。不应该被识别为标题。</p>'
        soup = BeautifulSoup(html, 'html.parser')
        p_el = soup.find('p')
        text = p_el.get_text().strip()

        is_heading, level = strategy._is_heading_element(p_el, text, toc_titles=set(), toc_anchors=set())

        assert is_heading is False

    def test_paragraph_with_bold_sentence_ending_with_period(self, strategy):
        html = '<p><b>这是一句加粗的特别强调的文本。</b>但是它以句号结尾且表达完整的段落意思。</p>'
        soup = BeautifulSoup(html, 'html.parser')
        p_el = soup.find('p')
        text = p_el.get_text().strip()

        is_heading, level = strategy._is_heading_element(p_el, text, toc_titles=set(), toc_anchors=set())

        assert is_heading is False

    def test_toc_anchor_and_title_matching(self, strategy):
        html = '<p id="sec_01">某种非常规样式的章节名</p>'
        soup = BeautifulSoup(html, 'html.parser')
        p_el = soup.find('p')
        text = p_el.get_text().strip()

        # 当 ID 在 toc_anchors 中时
        is_heading, level = strategy._is_heading_element(p_el, text, toc_titles=set(), toc_anchors={'sec_01'})
        assert is_heading is True
        assert level == 2
