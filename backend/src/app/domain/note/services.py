"""笔记与知识库领域服务模块"""

from typing import List, Optional, Tuple
from app.domain.note.entities import MaterialNote, SynthesizedNote, SynthesizedNoteType


class NoteDomainService:
    """笔记合成领域计算服务"""

    @staticmethod
    def synthesize_notes(
        title: str,
        material_notes: List[MaterialNote],
        note_type: SynthesizedNoteType = SynthesizedNoteType.GENERAL
    ) -> SynthesizedNote:
        """素材卡片合成算法存根"""
        content = "\n\n".join([n.content for n in material_notes])
        return SynthesizedNote(
            title=title,
            content=content,
            note_type=note_type,
            source_material_ids=[n.id for n in material_notes]
        )


    async def attach_note(
        self,
        task_id: str,
        material_note_id: Optional[str],
        paraphrase: Optional[str],
        original_snippet: Optional[str],
        scenario_context: Optional[str],
        tags: List[str]
    ) -> None:
        """
        沉淀业务规则：创建笔记并关联，或者直接绑定已有笔记，同时更新角标计数。
        """
        


        # task = await self.task_repo.find_task_by_id(task_id)
        # if not task:
        #     raise TaskNotFoundException(task_id)

        # # 场景 B: 绑定已有素材笔记
        # if material_note_id:
        #     existing_ids = await self.note_attachment_repo.get_attached_note_ids_by_task(task_id)
        #     if material_note_id in existing_ids:
        #         raise DuplicateNoteAttachmentException(task_id, material_note_id)

        #     note = await self.note_repo.get_material_note(material_note_id)
        #     if not note:
        #         raise KeyError(f"未找到指定的素材笔记: {material_note_id}")

        #     await self.note_attachment_repo.create_attachment_relation(task_id, material_note_id)
        #     task.increment_attached_note_count()
        #     await self.task_repo.save_task(task)
        #     return task, material_note_id

        # # 场景 A: 直接撰写记录并创建新笔记
        # else:
        #     # 格式化 content
        #     content_parts = []
        #     if original_snippet:
        #         content_parts.append(f"【原文】{original_snippet}")
        #     if paraphrase:
        #         content_parts.append(f"【转述】{paraphrase}")
        #     if scenario_context:
        #         content_parts.append(f"【情景】{scenario_context}")
        #     content = "\n".join(content_parts) if content_parts else ""

        #     # 创建笔记并保存到 note 领域
        #     note_id = f"note_{uuid.uuid4().hex[:8]}"
        #     note = MaterialNote(
        #         id=note_id,
        #         task_id=task_id,
        #         content=content,
        #         tags=tags
        #     )
        #     await self.note_repo.save_material_note(note)

        #     # 绑定关联关系
        #     await self.note_attachment_repo.create_attachment_relation(task_id, note_id)
        #     task.increment_attached_note_count()
        #     await self.task_repo.save_task(task)
        #     return task, note_id
