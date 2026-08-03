"""旁路图谱 (Graph RAG) 应用层用例 (Use Cases)"""

import logging
from typing import List

from app.domain.graph.entities import SourceTypeEnum, GraphPendingBlock
from app.domain.graph.service import GraphQueryDomainService, GraphOperationDomainService
from app.domain.note.service import NoteQueryDomainService
from app.domain.book.services import BookChapterContentDomainService

logger = logging.getLogger(__name__)


class ProcessPendingGraphBlocksUseCase:
    """批量处理旁路图谱待建图切片 (PENDING Blocks) 应用层用例"""

    def __init__(
        self,
        graph_query_service: GraphQueryDomainService,
        graph_sync_service: GraphOperationDomainService,
        note_query_service: NoteQueryDomainService,
        book_content_service: BookChapterContentDomainService,
    ) -> None:
        self.graph_query_service = graph_query_service
        self.graph_sync_service = graph_sync_service
        self.note_query_service = note_query_service
        self.book_content_service = book_content_service

    async def execute(self, limit: int = 20) -> int:
        """获取并批量处理待建图切片，返回实际处理的切片条数"""
        pending_blocks: List[GraphPendingBlock] = (
            await self.graph_query_service.fetch_pending_blocks(limit=limit)
        )
        if not pending_blocks:
            return 0

        processed_count = 0
        for block in pending_blocks:
            real_text = await self._resolve_real_text(block)
            try:
                await self.graph_sync_service.process_single_block(block, real_text)
                processed_count += 1
            except Exception as e:
                logger.error(
                    f"[ProcessPendingGraphBlocksUseCase] 处理 block_id={block.block_id} 异常: {str(e)}",
                    exc_info=True,
                )

        return processed_count

    async def _resolve_real_text(self, block: GraphPendingBlock) -> str:
        """根据 block.source_type 从对应的领域服务中反查真实的物理文本"""
        try:
            if block.source_type == SourceTypeEnum.NOTE_CARD:
                note = await self.note_query_service.get_material_note_by_id(block.block_id)
                if not note:
                    return ""
                parts = [
                    text for text in [note.user_interpretation, note.raw_quote, note.context_reflection]
                    if text
                ]
                return "\n".join(parts).strip()

            elif block.source_type == SourceTypeEnum.BOOK_BLOCK:
                result = await self.book_content_service.get_block_by_id(
                    block_id=block.block_id, book_id=block.project_id
                )
                if result:
                    content_block, _ = result
                    return content_block.text or ""
                return ""

            return ""
        except Exception as e:
            logger.warning(
                f"[ProcessPendingGraphBlocksUseCase] 反查真实文本失败: block_id={block.block_id}, source_type={block.source_type}, error={str(e)}"
            )
            return ""
