"""自由文档 Block 与 Markdown (MD) 的双向编译与转换工厂 (Factory)"""

import re
import base64
from typing import List
from app.domain.note.entities import DocumentBlock, BlockType


class NoteMarkdownFactory:
    """自由文档 Block 与 Markdown (MD) 的双向编译与转换工厂"""

    @staticmethod
    def compile_to_markdown(title: str, blocks: List[DocumentBlock]) -> str:
        """将 Block 节点树转换为带 HTML 注释快照的 Block-Flavored MD 文件内容"""
        md_parts = [f"# {title}"]
        
        for block in blocks:
            # 每一个 Block 上方均生成 HTML 元数据注释标记，便于精准反解析与恢复
            if block.block_type == BlockType.HEADING:
                md_parts.append(f'\n<!-- block:heading id="{block.block_id}" -->')
                md_parts.append(f"# {block.content}")
                
            elif block.block_type == BlockType.PARAGRAPH:
                md_parts.append(f'\n<!-- block:paragraph id="{block.block_id}" -->')
                md_parts.append(block.content)
                
            elif block.block_type == BlockType.CODE:
                md_parts.append(f'\n<!-- block:code id="{block.block_id}" -->')
                md_parts.append(f"```\n{block.content}\n```")
                
            elif block.block_type == BlockType.QUOTE:
                md_parts.append(f'\n<!-- block:quote id="{block.block_id}" -->')
                quoted = "\n".join([f"> {line}" for line in block.content.split("\n")])
                md_parts.append(quoted)
                
            elif block.block_type == BlockType.MATERIAL_REF:
                q_snap = block.quote_snapshot or ""
                i_snap = block.interpretation_snapshot or ""
                # base64 编码以规避引号、换行在 HTML 注释解析时的损坏
                q_b64 = base64.b64encode(q_snap.encode("utf-8")).decode("utf-8")
                i_b64 = base64.b64encode(i_snap.encode("utf-8")).decode("utf-8")
                
                md_parts.append(f'\n<!-- block:material_ref id="{block.block_id}" ref_id="{block.material_note_id or ""}" quote_snapshot="{q_b64}" interpretation_snapshot="{i_b64}" -->')
                md_parts.append("> **[素材引用]**")
                if q_snap:
                    md_parts.append(f"> **原文**：{q_snap}")
                if i_snap:
                    md_parts.append(f"> **转述**：{i_snap}")
                    
            elif block.block_type == BlockType.TASK_REF:
                md_parts.append(f'\n<!-- block:task_ref id="{block.block_id}" ref_id="{block.material_note_id or ""}" -->')
                md_parts.append(f"* [任务链接] {block.content}")
                
        return "\n".join(md_parts)

    @staticmethod
    def parse_from_markdown(markdown_content: str) -> List[DocumentBlock]:
        """从 Block-Flavored MD 中反解析出 Block 节点树"""
        # 匹配 <!-- block:TYPE id="ID" [attrs] --> 的正则
        pattern = r'<!-- block:(\w+) id="([^"]+)"(.*?) -->'
        matches = list(re.finditer(pattern, markdown_content))
        blocks = []
        
        for i, match in enumerate(matches):
            block_type_str = match.group(1).upper()
            block_id = match.group(2)
            extra_str = match.group(3)
            
            # 提取额外属性
            attrs = {}
            attr_matches = re.finditer(r'(\w+)="([^"]*)"', extra_str)
            for am in attr_matches:
                attrs[am.group(1)] = am.group(2)
                
            # 提取块内容范围
            start_idx = match.end()
            end_idx = matches[i+1].start() if i + 1 < len(matches) else len(markdown_content)
            content_segment = markdown_content[start_idx:end_idx].strip()
            
            # 尝试转换 BlockType
            try:
                block_type = BlockType(block_type_str)
            except ValueError:
                block_type = BlockType.PARAGRAPH
                
            clean_content = content_segment
            
            # 提取引用关系与快照
            ref_id = attrs.get("ref_id")
            quote_snapshot = None
            interpretation_snapshot = None
            
            if attrs.get("quote_snapshot"):
                try:
                    quote_snapshot = base64.b64decode(attrs["quote_snapshot"].encode("utf-8")).decode("utf-8")
                except Exception:
                    quote_snapshot = attrs["quote_snapshot"]
            if attrs.get("interpretation_snapshot"):
                try:
                    interpretation_snapshot = base64.b64decode(attrs["interpretation_snapshot"].encode("utf-8")).decode("utf-8")
                except Exception:
                    interpretation_snapshot = attrs["interpretation_snapshot"]
            
            # 针对不同类型进行格式清洗
            if block_type == BlockType.HEADING:
                clean_content = re.sub(r'^#+\s*', '', clean_content)
            elif block_type == BlockType.CODE:
                clean_content = re.sub(r'^```\w*\n', '', clean_content)
                clean_content = re.sub(r'\n```$', '', clean_content)
            elif block_type == BlockType.QUOTE:
                # 每一行开头的 > 清理掉
                lines = []
                for line in clean_content.split("\n"):
                    lines.append(re.sub(r'^>\s*', '', line))
                clean_content = "\n".join(lines)
            elif block_type == BlockType.MATERIAL_REF:
                clean_content = ""  # 引用本身是快照展示，其文本内容清空以防噪
            elif block_type == BlockType.TASK_REF:
                clean_content = re.sub(r'^\*\s*\[任务链接\]\s*', '', clean_content)
                
            blocks.append(DocumentBlock(
                block_id=block_id,
                block_type=block_type,
                content=clean_content,
                material_note_id=ref_id,
                quote_snapshot=quote_snapshot,
                interpretation_snapshot=interpretation_snapshot
            ))
            
        return blocks
