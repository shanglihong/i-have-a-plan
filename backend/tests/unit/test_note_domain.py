"""笔记领域模型与服务单元测试"""

import pytest
from app.domain.note.entities import DocumentBlock, BlockType, SourceAnchor
from app.domain.note.factory import NoteMarkdownFactory



def test_note_markdown_factory_roundtrip() -> None:
    """测试自由文档 Block 与 Markdown 文本的编译与反解析双向流程"""
    title = "深度学习反向传播总结"
    
    blocks = [
        DocumentBlock(
            block_id="blk_h_1",
            block_type=BlockType.HEADING,
            content="反向传播基础"
        ),
        DocumentBlock(
            block_id="blk_p_1",
            block_type=BlockType.PARAGRAPH,
            content="反向传播主要基于链式法则进行梯度回传。"
        ),
        DocumentBlock(
            block_id="blk_c_1",
            block_type=BlockType.CODE,
            content="def backward(loss):\n    return loss * 2"
        ),
        DocumentBlock(
            block_id="blk_q_1",
            block_type=BlockType.QUOTE,
            content="这里可以是一个引用文本。\n支持多行引用。"
        ),
        DocumentBlock(
            block_id="blk_ref_1",
            block_type=BlockType.MATERIAL_REF,
            content="",
            material_note_id="mat_12345",
            quote_snapshot="神经网络是一种模仿...",
            interpretation_snapshot="Reflected interpretation"
        ),
        DocumentBlock(
            block_id="blk_t_1",
            block_type=BlockType.TASK_REF,
            content="已完结任务步骤",
            material_note_id="task_8899"
        ),
    ]

    # 1. 编译
    md_content = NoteMarkdownFactory.compile_to_markdown(title, blocks)
    assert "# 深度学习反向传播总结" in md_content
    assert "<!-- block:heading id=\"blk_h_1\" -->" in md_content
    assert "<!-- block:material_ref id=\"blk_ref_1\" ref_id=\"mat_12345\"" in md_content

    # 2. 反解析
    parsed_blocks = NoteMarkdownFactory.parse_from_markdown(md_content)
    
    assert len(parsed_blocks) == len(blocks)
    
    # 3. 校验各 block
    assert parsed_blocks[0].block_id == "blk_h_1"
    assert parsed_blocks[0].block_type == BlockType.HEADING
    assert parsed_blocks[0].content == "反向传播基础"
    
    assert parsed_blocks[1].block_id == "blk_p_1"
    assert parsed_blocks[1].block_type == BlockType.PARAGRAPH
    assert parsed_blocks[1].content == "反向传播主要基于链式法则进行梯度回传。"
    
    assert parsed_blocks[2].block_id == "blk_c_1"
    assert parsed_blocks[2].block_type == BlockType.CODE
    assert parsed_blocks[2].content == "def backward(loss):\n    return loss * 2"
    
    assert parsed_blocks[3].block_id == "blk_q_1"
    assert parsed_blocks[3].block_type == BlockType.QUOTE
    assert parsed_blocks[3].content == "这里可以是一个引用文本。\n支持多行引用。"
    
    assert parsed_blocks[4].block_id == "blk_ref_1"
    assert parsed_blocks[4].block_type == BlockType.MATERIAL_REF
    assert parsed_blocks[4].material_note_id == "mat_12345"
    assert parsed_blocks[4].quote_snapshot == "神经网络是一种模仿..."
    assert parsed_blocks[4].interpretation_snapshot == "Reflected interpretation"
    
    assert parsed_blocks[5].block_id == "blk_t_1"
    assert parsed_blocks[5].block_type == BlockType.TASK_REF
    assert parsed_blocks[5].material_note_id == "task_8899"
    # 前缀在反解析时已成功被剥离
    assert parsed_blocks[5].content == "已完结任务步骤"



