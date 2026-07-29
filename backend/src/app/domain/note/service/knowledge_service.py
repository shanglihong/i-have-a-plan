"""知识库领域服务 (Domain Service)"""

from typing import List, Optional
from app.domain.note.entities import KnowledgeBase
from app.domain.note.ports import KnowledgeBaseRepositoryPort, SynthesizedNoteRepositoryPort


class KnowledgeBaseDomainService:
    """知识库管理与绑定协调领域服务"""

    def __init__(
        self,
        kb_repo: KnowledgeBaseRepositoryPort,
        synthesized_repo: SynthesizedNoteRepositoryPort,
    ):
        self.kb_repo = kb_repo
        self.synthesized_repo = synthesized_repo

    async def create_knowledge_base(self, title: str, description: str) -> KnowledgeBase:
        """创建知识库"""
        kb = KnowledgeBase(title=title, description=description)
        await self.kb_repo.save(kb)
        return kb

    async def get_knowledge_base(self, kb_id: str) -> Optional[KnowledgeBase]:
        """按 ID 获取知识库，并批量填充绑定的笔记实体列表"""
        kb = await self.kb_repo.find_by_id(kb_id)
        if not kb:
            return None
        kb.notes = await self.synthesized_repo.find_by_kb_id(kb_id)
        return kb

    async def list_knowledge_bases(self) -> List[KnowledgeBase]:
        """获取所有知识库列表，并批量填充各自绑定的笔记实体"""
        kbs = await self.kb_repo.list_all()
        for kb in kbs:
            kb.notes = await self.synthesized_repo.find_by_kb_id(kb.id)
        return kbs

    async def delete_knowledge_base(self, kb_id: str) -> bool:
        """物理删除知识库，并解绑旗下所有的沉淀笔记"""
        # 1. 批量解除属于该知识库的所有沉淀笔记的关联 (仅解绑，不删除)
        await self.synthesized_repo.clear_knowledge_base_id_batch(kb_id)
        # 2. 物理删除知识库本身
        return await self.kb_repo.delete(kb_id)

    async def bind_notes_to_knowledge_base(self, kb_id: str, note_ids: List[str]) -> None:
        """将一批沉淀笔记绑定至指定知识库"""
        kb = await self.kb_repo.find_by_id(kb_id)
        if not kb:
            raise KeyError(f"未找到知识库: {kb_id}")
        
        # 将这些笔记的 knowledge_base_id 设为 kb_id 并保存
        for note_id in note_ids:
            note = await self.synthesized_repo.find_synthesized_by_id(note_id)
            if note:
                note.knowledge_base_id = kb_id
                await self.synthesized_repo.save_synthesized(note)

    async def unbind_notes_from_knowledge_base(self, kb_id: str, note_ids: List[str]) -> None:
        """将一批沉淀笔记从知识库解绑"""
        kb = await self.kb_repo.find_by_id(kb_id)
        if not kb:
            raise KeyError(f"未找到知识库: {kb_id}")
        
        # 将这些笔记的 knowledge_base_id 置为 None
        for note_id in note_ids:
            note = await self.synthesized_repo.find_synthesized_by_id(note_id)
            if note and note.knowledge_base_id == kb_id:
                note.knowledge_base_id = None
                await self.synthesized_repo.save_synthesized(note)
