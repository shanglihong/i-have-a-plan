"""测试 ProcessPendingGraphBlocksUseCase 旁路图谱 pending block 处理用例"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.application.graph.use_cases import ProcessPendingGraphBlocksUseCase
from app.domain.graph.entities import GraphPendingBlock, PendingStatusEnum, SourceTypeEnum
from app.domain.note.entities import MaterialNote
from app.domain.book.entities import ContentBlock


@pytest.mark.asyncio
async def test_process_pending_blocks_note_card():
    # 模拟 GraphQueryDomainService
    graph_query_service = MagicMock()
    pending_block = GraphPendingBlock(
        block_id="note_123",
        source_type=SourceTypeEnum.NOTE_CARD,
        project_id="proj_1",
        status=PendingStatusEnum.PENDING,
    )
    graph_query_service.fetch_pending_blocks = AsyncMock(return_value=[pending_block])

    # 模拟 GraphOperationDomainService
    graph_sync_service = MagicMock()
    graph_sync_service.process_single_block = AsyncMock()

    # 模拟 NoteQueryDomainService
    note_query_service = MagicMock()
    note_entity = MaterialNote(
        id="note_123",
        project_id="proj_1",
        user_interpretation="个人转述观点",
        raw_quote="参考原文句子",
    )
    note_query_service.get_material_note_by_id = AsyncMock(return_value=note_entity)

    # 模拟 BookChapterContentDomainService
    book_content_service = MagicMock()

    use_case = ProcessPendingGraphBlocksUseCase(
        graph_query_service=graph_query_service,
        graph_sync_service=graph_sync_service,
        note_query_service=note_query_service,
        book_content_service=book_content_service,
    )

    count = await use_case.execute(limit=10)

    assert count == 1
    graph_query_service.fetch_pending_blocks.assert_called_once_with(limit=10)
    note_query_service.get_material_note_by_id.assert_called_once_with("note_123")
    graph_sync_service.process_single_block.assert_called_once_with(
        pending_block, "个人转述观点\n参考原文句子"
    )


@pytest.mark.asyncio
async def test_process_pending_blocks_book_block():
    graph_query_service = MagicMock()
    pending_block = GraphPendingBlock(
        block_id="blk_456",
        source_type=SourceTypeEnum.BOOK_BLOCK,
        project_id="book_789",
        status=PendingStatusEnum.PENDING,
    )
    graph_query_service.fetch_pending_blocks = AsyncMock(return_value=[pending_block])

    graph_sync_service = MagicMock()
    graph_sync_service.process_single_block = AsyncMock()

    note_query_service = MagicMock()

    book_content_service = MagicMock()
    mock_block = ContentBlock(block_id="blk_456", text="图书章节包含的真实段落")
    book_content_service.get_block_by_id = AsyncMock(return_value=(mock_block, "chap_1"))

    use_case = ProcessPendingGraphBlocksUseCase(
        graph_query_service=graph_query_service,
        graph_sync_service=graph_sync_service,
        note_query_service=note_query_service,
        book_content_service=book_content_service,
    )

    count = await use_case.execute(limit=20)

    assert count == 1
    book_content_service.get_block_by_id.assert_called_once_with(
        block_id="blk_456", book_id="book_789"
    )
    graph_sync_service.process_single_block.assert_called_once_with(
        pending_block, "图书章节包含的真实段落"
    )


def test_register_schedulers():
    from app.schedulers import register_schedulers, scheduler
    sched = register_schedulers()
    assert sched is not None
    job = sched.get_job("handle_pending_graph_blocks_job")
    assert job is not None

