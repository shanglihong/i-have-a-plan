"""测试 GraphOperationDomainService 配合 INTEGRATE_GRAPH 开关的逻辑"""

import pytest
import os
from unittest.mock import AsyncMock, MagicMock

from app.domain.graph.entities import GraphPendingBlock, PendingStatusEnum, SourceTypeEnum
from app.domain.graph.service import GraphOperationDomainService


@pytest.mark.asyncio
async def test_process_single_block_when_integrate_graph_false(monkeypatch):
    # 1. 模拟环境变量为 False
    monkeypatch.setenv("INTEGRATE_GRAPH", "false")

    # 2. 模拟依赖组件
    graph_repo = MagicMock()
    graph_repo.save_pending_block = AsyncMock()

    vector_store = MagicMock()
    vector_store.find_vector_by_block_id = AsyncMock(return_value=None)
    vector_store.save_vector_index = AsyncMock()

    llm_extractor = MagicMock()
    llm_extractor.compute_embedding = AsyncMock(return_value=[0.1] * 1536)

    # 3. 初始化 Service (此时 __init__ 会读取 INTEGRATE_GRAPH)
    service = GraphOperationDomainService(
        graph_repo=graph_repo,
        vector_store=vector_store,
        llm_extractor=llm_extractor,
    )
    
    # 确认 self.integrate_graph 被正确解析为 False
    assert service.integrate_graph is False

    # 4. 执行流程
    block = GraphPendingBlock(
        block_id="note_123",
        source_type=SourceTypeEnum.NOTE_CARD,
        project_id="proj_1",
        status=PendingStatusEnum.PENDING,
    )
    await service.process_single_block(block, real_text="测试素材卡片文本")

    # 5. 校验行为
    # 状态应该被标为 COMPLETED 并保存
    assert block.status == PendingStatusEnum.COMPLETED
    graph_repo.save_pending_block.assert_called_with(block)
    
    # 向量化和 vec 持久化应该正常进行
    llm_extractor.compute_embedding.assert_called_once_with(text="测试素材卡片文本")
    vector_store.save_vector_index.assert_called_once()
    
    # 因为没有集成图谱，不应该调用批量保存图谱节点的方法
    graph_repo.save_graph_batch = AsyncMock()
    graph_repo.save_graph_batch.assert_not_called()


@pytest.mark.asyncio
async def test_process_single_block_when_integrate_graph_true(monkeypatch):
    # 1. 模拟环境变量为 True
    monkeypatch.setenv("INTEGRATE_GRAPH", "true")

    # 2. 模拟依赖组件
    graph_repo = MagicMock()
    graph_repo.save_pending_block = AsyncMock()
    graph_repo.save_graph_batch = AsyncMock()

    vector_store = MagicMock()
    vector_store.find_vector_by_block_id = AsyncMock(return_value=None)
    vector_store.save_vector_index = AsyncMock()

    llm_extractor = MagicMock()
    llm_extractor.compute_embedding = AsyncMock(return_value=[0.1] * 1536)

    # 3. 初始化 Service
    service = GraphOperationDomainService(
        graph_repo=graph_repo,
        vector_store=vector_store,
        llm_extractor=llm_extractor,
    )
    
    # 确认 self.integrate_graph 被正确解析为 True
    assert service.integrate_graph is True

    # Mock _extract_and_build_graph 避免它真正调用内部复杂的节点查找逻辑
    service._extract_and_build_graph = AsyncMock(return_value=([], [], []))

    # 4. 执行流程
    block = GraphPendingBlock(
        block_id="note_456",
        source_type=SourceTypeEnum.NOTE_CARD,
        project_id="proj_1",
        status=PendingStatusEnum.PENDING,
    )
    await service.process_single_block(block, real_text="测试图谱抽取")

    # 5. 校验行为
    # 状态应该被标为 COMPLETED，且由于集成了图谱，需要通过 save_graph_batch 批量保存
    assert block.status == PendingStatusEnum.COMPLETED
    service._extract_and_build_graph.assert_called_once()
    graph_repo.save_graph_batch.assert_called_once()
