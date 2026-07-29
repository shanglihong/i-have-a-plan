"""知识库领域服务与持久化仓储单元测试"""

import pytest
from app.domain.note.entities import KnowledgeBase, SynthesizedNote
from app.domain.note.service import KnowledgeBaseDomainService
from app.infrastructure.db.repositories.material_note_repository import NoteRepositoryAdapter


@pytest.mark.asyncio
async def test_knowledge_base_crud_and_binding(test_session) -> None:
    """测试知识库的 CRUD 仓储生命周期，以及绑定与解绑操作"""
    note_repo = NoteRepositoryAdapter(test_session)
    kb_service = KnowledgeBaseDomainService(kb_repo=note_repo, synthesized_repo=note_repo)

    # 1. 创建知识库
    kb = await kb_service.create_knowledge_base(title="精益研发知识库", description="收集日常研发的优质沉淀")
    assert kb.id is not None
    assert kb.title == "精益研发知识库"

    # 2. 模拟先存两个沉淀笔记到 DB
    note1 = SynthesizedNote(project_id="proj_1", title="沉淀笔记 1", file_path="data/notes/syn_1.md")
    note1.id = "syn_note_1"
    note2 = SynthesizedNote(project_id="proj_1", title="沉淀笔记 2", file_path="data/notes/syn_2.md")
    note2.id = "syn_note_2"

    await note_repo.save(note1)
    await note_repo.save(note2)

    # 3. 绑定测试
    await kb_service.bind_notes_to_knowledge_base(kb.id, ["syn_note_1", "syn_note_2"])

    # 4. 重新加载查询，验证知识库中的笔记列表是否已加载绑定
    reloaded_kb = await kb_service.get_knowledge_base(kb.id)
    assert reloaded_kb is not None
    # 验证实体列表已填充
    assert len(reloaded_kb.notes) == 2
    note_ids = [n.id for n in reloaded_kb.notes]
    assert "syn_note_1" in note_ids
    assert "syn_note_2" in note_ids

    # 同时校验笔记本身的关联 ID
    saved_note1 = await note_repo.find_by_id("syn_note_1")
    assert saved_note1.knowledge_base_id == kb.id

    # 5. 解绑测试
    await kb_service.unbind_notes_from_knowledge_base(kb.id, ["syn_note_1"])
    
    # 重新加载验证
    reloaded_kb2 = await kb_service.get_knowledge_base(kb.id)
    # 验证解绑后实体列表也同步更新
    assert len(reloaded_kb2.notes) == 1
    assert reloaded_kb2.notes[0].id == "syn_note_2"

    saved_note1_unbind = await note_repo.find_by_id("syn_note_1")
    assert saved_note1_unbind.knowledge_base_id is None

    # 6. 列出所有测试
    kbs = await kb_service.list_knowledge_bases()
    assert len(kbs) >= 1
    assert len(kbs[0].notes) == 1

    # 7. 删除知识库测试，应自动解绑关联笔记
    success = await kb_service.delete_knowledge_base(kb.id)
    assert success is True

    # 校验删除结果
    deleted_kb = await kb_service.get_knowledge_base(kb.id)
    assert deleted_kb is None

    # 验证原先绑定的笔记也被置空了外键 (syn_note_2)
    saved_note2_unbind = await note_repo.find_by_id("syn_note_2")
    assert saved_note2_unbind.knowledge_base_id is None
