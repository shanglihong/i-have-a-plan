"""Note 领域应用层 UseCases 单元集成测试"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from app.domain.exceptions import DomainException
from app.domain.note.entities import MaterialNote, SynthesizedNote, SynthesizedNoteType, DocumentBlock, BlockType, SourceAnchor
from app.application.note.dtos import (
    CreateMaterialNoteDTO,
    SourceAnchorDTO,
    CreateSynthesizedNoteDTO,
    UpdateSynthesizedNoteDTO,
    DocumentBlockDTO,
)
from app.application.note.use_cases import (
    CreateMaterialNoteUseCase,
    GetMaterialNotesUseCase,
    CreateSynthesizedNoteUseCase,
    GetSynthesizedNoteUseCase,
    UpdateSynthesizedNoteUseCase,
    DeleteSynthesizedNoteUseCase,
    NoteSandboxHealingUseCase,
    CorrectNoteAnchorUseCase,
)
from app.infrastructure.db.repositories.note_repository import NoteRepositoryAdapter
from app.domain.note.service import NoteQueryDomainService, NoteStateDomainService, NoteOperationDomainService


@pytest.mark.asyncio
async def test_create_material_note_use_case(test_session) -> None:
    """测试创建素材笔记流程 (包含跨领域防腐校验和事件发布)"""
    # 1. 准备适配器与 Mock 依赖
    note_repo = NoteRepositoryAdapter(test_session)
    book_content_service = MagicMock()
    book_content_service.validate_block_exists = AsyncMock(return_value=True)
    
    project_query_service = MagicMock()
    project_query_service.get_project = AsyncMock(return_value=MagicMock())
    
    task_query_service = MagicMock()
    task_query_service.get_task = AsyncMock(return_value=MagicMock())
    
    event_publisher = MagicMock()
    event_publisher.publish = AsyncMock()

    file_storage = MagicMock()

    # 2. 构造 DTO
    anchor_dto = SourceAnchorDTO(
        book_id="bk_1",
        chapter_id="chap_1",
        start_offset=10,
        end_offset=20,
        feature_text="神经网络"
    )
    dto = CreateMaterialNoteDTO(
        project_id="proj_1",
        task_id="task_1",
        source_type="BOOK_BLOCK",
        raw_quote="神经网络是一种模仿...",
        user_interpretation="个人转述",
        context_reflection="关联经历",
        source_anchor=anchor_dto,
        tags=["AI", "DeepLearning"]
    )

    # 3. 执行 UseCase
    note_state_service = NoteStateDomainService(
        material_repo=note_repo,
        synthesized_repo=note_repo,
        file_storage_port=file_storage,
        event_publisher=event_publisher,
    )
    uc = CreateMaterialNoteUseCase(
        note_state_service, book_content_service, project_query_service, task_query_service
    )
    res = await uc.execute(dto)

    # 4. 校验返回值与 DB 写入
    assert res.id.startswith("mat_")
    assert res.project_id == "proj_1"
    assert res.task_id == "task_1"
    assert res.user_interpretation == "个人转述"
    assert res.anchor_summary == "chap_1"

    # 从数据库取出校验
    saved_note = await note_repo.find_by_id(res.id)
    assert saved_note is not None
    assert saved_note.user_interpretation == "个人转述"
    assert saved_note.source_anchor.feature_text == "神经网络"

    # 校验事件发布
    event_publisher.publish.assert_called_once()


@pytest.mark.asyncio
async def test_create_synthesized_note_use_case(test_session) -> None:
    """测试提炼合并沉淀笔记 UseCase 流程"""
    # 1. 准备数据：先存盘一个素材笔记
    note_repo = NoteRepositoryAdapter(test_session)
    
    mat_note = MaterialNote(
        project_id="proj_1",
        task_id="task_1",
        raw_quote="原文快照",
        user_interpretation="转述快照"
    )
    mat_note.id = "mat_112233"
    await note_repo.save(mat_note)

    # Mock 依赖
    project_query_service = MagicMock()
    project_query_service.get_project = AsyncMock(return_value=MagicMock())

    file_storage = MagicMock()
    file_storage.write_markdown_file_atomic = AsyncMock(return_value="data/notes/syn_123.md")

    event_publisher = MagicMock()
    event_publisher.publish = AsyncMock()

    # 2. 构造 DTO
    block_ref = DocumentBlockDTO(
        block_type="MATERIAL_REF",
        content="",
        material_note_id="mat_112233"
    )
    block_p = DocumentBlockDTO(
        block_type="PARAGRAPH",
        content="常规段落总结内容。"
    )
    dto = CreateSynthesizedNoteDTO(
        project_id="proj_1",
        title="飞书Block合并笔记",
        note_type="GENERAL",
        blocks=[block_p, block_ref]
    )

    # 3. 执行 UseCase
    note_query_service = NoteQueryDomainService(
        material_repo=note_repo,
        synthesized_repo=note_repo,
        file_storage_port=file_storage,
    )
    note_state_service = NoteStateDomainService(
        material_repo=note_repo,
        synthesized_repo=note_repo,
        file_storage_port=file_storage,
        event_publisher=event_publisher,
    )
    uc = CreateSynthesizedNoteUseCase(
        note_state_service, note_query_service, project_query_service
    )
    res = await uc.execute(dto)

    # 4. 校验结果
    assert res.id.startswith("syn_")
    assert res.title == "飞书Block合并笔记"
    assert res.referenced_material_count == 1

    # 校验文件系统写入被调用
    file_storage.write_markdown_file_atomic.assert_called_once()


@pytest.mark.asyncio
async def test_get_synthesized_note_detail(test_session) -> None:
    """测试获取沉淀笔记详情 (含懒加载物理 Markdown 并解析成 Blocks)"""
    note_repo = NoteRepositoryAdapter(test_session)
    
    # 1. 预存元数据至 DB
    note = SynthesizedNote(
        project_id="proj_1",
        title="详情测试笔记",
        note_type=SynthesizedNoteType.GENERAL,
        file_path="data/notes/syn_test.md"
    )
    note.id = "syn_test"
    await note_repo.save(note)

    # 2. 模拟物理 Markdown 内容
    md_content = """# 详情测试笔记

<!-- block:heading id="blk_1" -->
# 章节标题

<!-- block:paragraph id="blk_2" -->
段落正文文本。
"""
    file_storage = MagicMock()
    file_storage.read_markdown_file = AsyncMock(return_value=md_content)

    # 3. 执行 UseCase
    note_query_service = NoteQueryDomainService(
        material_repo=note_repo,
        synthesized_repo=note_repo,
        file_storage_port=file_storage,
    )
    uc = GetSynthesizedNoteUseCase(note_query_service)
    res = await uc.execute("syn_test")

    # 4. 验证详情获取
    assert res.id == "syn_test"
    assert res.title == "详情测试笔记"
    assert len(res.blocks) == 2
    assert res.blocks[0].block_id == "blk_1"
    assert res.blocks[0].content == "章节标题"
    assert res.blocks[1].block_id == "blk_2"
    assert res.blocks[1].content == "段落正文文本。"


@pytest.mark.asyncio
async def test_note_sandbox_healing(test_session) -> None:
    """测试冷启动自愈逻辑"""
    note_repo = NoteRepositoryAdapter(test_session)
    
    # 1. 模拟 DB 注册记录
    note1 = SynthesizedNote(project_id="p1", title="note1", file_path="data/notes/syn_1.md")
    note1.id = "syn_1"
    await note_repo.save(note1)
    
    # 模拟还有一封 EXPERIENCE 笔记
    note2 = SynthesizedNote(project_id="p1", title="exp2", note_type=SynthesizedNoteType.GENERAL, file_path="data/notes/syn_exp2.md")
    note2.id = "syn_exp2"
    await note_repo.save(note2)

    # 2. 模拟物理目录扫描结果：
    # syn_1.md (已注册，完好)
    # syn_exp2.md (已注册，完好)
    # syn_orphan.md (未在 DB 注册的孤岛离线垃圾文件，理应被删除)
    file_storage = MagicMock()
    file_storage.clean_temporary_files = AsyncMock(return_value=["data/notes/tmp_xxx.md.tmp"])
    file_storage.scan_all_physical_files = AsyncMock(return_value=[
        "data/notes/syn_1.md",
        "data/notes/syn_exp2.md",
        "data/notes/syn_orphan.md"
    ])
    file_storage.delete_markdown_file = AsyncMock()

    # 3. 执行自愈 UseCase
    note_query_service = NoteQueryDomainService(
        material_repo=note_repo,
        synthesized_repo=note_repo,
        file_storage_port=file_storage,
    )
    uc = NoteSandboxHealingUseCase(note_query_service, file_storage)
    await uc.execute()

    # 4. 校验孤岛文件 syn_orphan.md 是否被调用删除
    file_storage.delete_markdown_file.assert_called_with("data/notes/syn_orphan.md")


@pytest.mark.asyncio
async def test_correct_note_anchor_use_case(test_session) -> None:
    """测试高亮坐标纠偏 UseCase 流程"""
    note_repo = NoteRepositoryAdapter(test_session)
    
    # 1. 先存一个素材卡片
    mat_note = MaterialNote(
        project_id="proj_1",
        task_id="task_1",
        user_interpretation="原转述内容"
    )
    mat_note.id = "mat_to_correct"
    await note_repo.save(mat_note)

    # 2. 构造纠偏 DTO
    dto = SourceAnchorDTO(
        book_id="bk_1",
        chapter_id="chap_1",
        start_offset=100,
        end_offset=120,
        feature_text="纠偏后的新特征词"
    )

    # 3. 执行 UseCase
    note_op_service = NoteOperationDomainService(note_repo)
    uc = CorrectNoteAnchorUseCase(note_op_service)
    await uc.execute("mat_to_correct", dto)

    # 4. 校验 DB 中的坐标是否更新
    saved_note = await note_repo.find_by_id("mat_to_correct")
    assert saved_note is not None
    assert saved_note.source_anchor is not None
    assert saved_note.source_anchor.start_offset == 100
    assert saved_note.source_anchor.end_offset == 120
    assert saved_note.source_anchor.feature_text == "纠偏后的新特征词"
