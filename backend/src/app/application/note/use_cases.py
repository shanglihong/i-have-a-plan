"""笔记领域应用层 UseCases (业务流程编排层)"""
from app.domain.note import KnowledgeBaseDomainService
from app.domain.project.services import TaskQueryDomainService
import logging
from datetime import datetime, timezone
from typing import Optional

from app.utils.cursor import encode_cursor
from app.utils.path import get_note_dir

from app.domain.exceptions import DomainException
from app.domain.note.entities import (
    MaterialNote,
    SynthesizedNote,
    SourceAnchor,
    DocumentBlock,
    SourceType,
    SynthesizedNoteType,
    BlockType,
)

from app.domain.note.service import NoteQueryDomainService, NoteStateDomainService, NoteOperationDomainService
from app.domain.book.services.query_service import BookChapterContentDomainService
from app.domain.project.services.project_query_service import ProjectQueryDomainService
from app.application.note.dtos import (
    CreateMaterialNoteDTO,
    SourceAnchorDTO,
    MaterialNoteVO,
    MaterialNotePageVO,
    CreateSynthesizedNoteDTO,
    SynthesizedNoteVO,
    SynthesizedNoteDetailVO,
    UpdateSynthesizedNoteDTO,
    DocumentBlockDTO,
    DeleteResponseVO,
)
from app.utils.snow import id_worker

logger = logging.getLogger(__name__)


class CreateMaterialNoteUseCase:
    """创建素材笔记 UseCase (划词高亮/伴读转存双通道)"""

    def __init__(
        self,
        note_state_service: NoteStateDomainService,
        book_content_service: BookChapterContentDomainService,
        project_query_service: ProjectQueryDomainService,
        task_query_service: TaskQueryDomainService,
    ):
        self.note_state_service = note_state_service
        self.book_content_service = book_content_service
        self.project_query_service = project_query_service
        self.task_query_service = task_query_service

    async def execute(self, dto: CreateMaterialNoteDTO) -> MaterialNoteVO:
        # 强制将 source_type 字符串转为枚举
        try:
            st = SourceType(dto.source_type)
        except ValueError:
            st = SourceType.USER_THOUGHT

        # 1. 跨领域校验项目与 Task 合法性
        project = await self.project_query_service.get_project(dto.project_id)
        if not project:
            raise DomainException(f"关联的项目不存在: {dto.project_id}", status_code=404)

        if st == SourceType.EXPERIENCE:
            if not (project.is_archived() or project.is_active()):
                raise DomainException(f"项目未进入复盘阶段，无法创建经验笔记", status_code=400)
        else:
            task = await self.task_query_service.get_task(dto.task_id)
            if not task:
                raise DomainException(f"关联的 Task 不存在: {dto.task_id}", status_code=404)

        # 2. 如果是划词高亮，跨领域校验书籍和章节存在性
        source_anchor = None
        anchor_summary = None
        if dto.source_anchor:
            sa_dto = dto.source_anchor
            if not await self.book_content_service.validate_block_exists(sa_dto.book_id, sa_dto.chapter_id):
                raise DomainException(f"书籍章节正文校验失败: book_id={sa_dto.book_id}, chapter_id={sa_dto.chapter_id}", status_code=404)
            
            source_anchor = SourceAnchor(
                book_id=sa_dto.book_id,
                chapter_id=sa_dto.chapter_id,
                start_offset=sa_dto.start_offset,
                end_offset=sa_dto.end_offset,
                feature_text=sa_dto.feature_text
            )
            # 生成前端高亮渲染的位置摘要，格式类似于 "Ch.01" 或者 "P.42 (Ch.01)"
            anchor_summary = f"{sa_dto.chapter_id}"

        # 3. 创建素材笔记聚合根
        note = MaterialNote(
            project_id=dto.project_id,
            task_id=dto.task_id or "",
            source_type=st,
            raw_quote=dto.raw_quote,
            user_interpretation=dto.user_interpretation,
            context_reflection=dto.context_reflection,
            source_anchor=source_anchor,
            tags=dto.tags
        )
        
        # 4. 持久化落库
        await self.note_state_service.create_material_note(note)

        sa_dto_vo = None
        if note.source_anchor:
            sa_dto_vo = SourceAnchorDTO(
                book_id=note.source_anchor.book_id,
                chapter_id=note.source_anchor.chapter_id,
                start_offset=note.source_anchor.start_offset,
                end_offset=note.source_anchor.end_offset,
                feature_text=note.source_anchor.feature_text,
            )

        # 6. 返回 VO
        return MaterialNoteVO(
            id=note.id,
            project_id=note.project_id,
            task_id=note.task_id,
            source_type=note.source_type.value,
            raw_quote=note.raw_quote,
            user_interpretation=note.user_interpretation,
            context_reflection=note.context_reflection,
            tags=note.tags,
            created_at=note.created_at.isoformat(),
            anchor_summary=anchor_summary,
            source_anchor=sa_dto_vo,
        )


class GetMaterialNotesUseCase:
    """Cursor 分页查询素材笔记 UseCase (支持跨项目)"""

    def __init__(self, note_query_service: NoteQueryDomainService):
        self.note_query_service = note_query_service

    async def execute(
        self,
        project_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 15,
        keyword: Optional[str] = None
    ) -> MaterialNotePageVO:
        # 跨项目或项目内游标查询
        notes = await self.note_query_service.list_material_notes_cursor(
            project_id=project_id,
            cursor=cursor,
            limit=limit + 1,  # 额外取一个用以判定 has_next
            keyword=keyword
        )

        has_next = len(notes) > limit
        if has_next:
            notes = notes[:limit]
            last_item = notes[-1]
            next_cursor = encode_cursor(last_item.created_at, last_item.id)
        else:
            next_cursor = None

        items_vo = []
        for note in notes:
            summary = None
            sa_dto_vo = None
            if note.source_anchor:
                summary = f"{note.source_anchor.chapter_id}"
                sa_dto_vo = SourceAnchorDTO(
                    book_id=note.source_anchor.book_id,
                    chapter_id=note.source_anchor.chapter_id,
                    start_offset=note.source_anchor.start_offset,
                    end_offset=note.source_anchor.end_offset,
                    feature_text=note.source_anchor.feature_text,
                )
                
            items_vo.append(MaterialNoteVO(
                id=note.id,
                project_id=note.project_id,
                task_id=note.task_id,
                source_type=note.source_type.value,
                raw_quote=note.raw_quote,
                user_interpretation=note.user_interpretation,
                context_reflection=note.context_reflection,
                tags=note.tags,
                created_at=note.created_at.isoformat(),
                anchor_summary=summary,
                source_anchor=sa_dto_vo
            ))

        return MaterialNotePageVO(
            items=items_vo,
            next_cursor=next_cursor,
            has_next=has_next
        )


class CreateSynthesizedNoteUseCase:
    """提炼与创建沉淀笔记 UseCase (飞书式 Block)"""

    def __init__(
        self,
        note_state_service: NoteStateDomainService,
        note_query_service: NoteQueryDomainService,
        project_query_service: ProjectQueryDomainService,
    ):
        self.note_state_service = note_state_service
        self.note_query_service = note_query_service
        self.project_query_service = project_query_service

    async def execute(self, dto: CreateSynthesizedNoteDTO) -> SynthesizedNoteVO:
        # 1. 跨领域校验项目存在性
        project = await self.project_query_service.get_project(dto.project_id)
        if not project:
            raise DomainException(f"归属的项目不存在: {dto.project_id}", status_code=404)

        try:
            nt = SynthesizedNoteType(dto.note_type)
        except ValueError:
            nt = SynthesizedNoteType.GENERAL

        # 3. 校验素材引用合法性
        domain_blocks = []
        referenced_material_count = 0
        for b_dto in dto.blocks:
            # DTO 转领域对象
            db = DocumentBlock(
                block_id=b_dto.block_id or f"blk_{id_worker.next_id_str()}",
                block_type=BlockType(b_dto.block_type),
                content=b_dto.content,
                material_note_id=b_dto.material_note_id,
                quote_snapshot=b_dto.quote_snapshot,
                interpretation_snapshot=b_dto.interpretation_snapshot
            )
            if db.block_type == BlockType.MATERIAL_REF:
                if not db.material_note_id:
                    raise DomainException("素材引用 Block 必须提供 material_note_id", status_code=400)
                mat_note = await self.note_query_service.get_material_note_by_id(db.material_note_id)
                if not mat_note:
                    raise DomainException(f"引用的素材笔记不存在: {db.material_note_id}", status_code=404)
                # 使用真实的数据覆盖前端快照以作双保险
                db = DocumentBlock(
                    block_id=db.block_id,
                    block_type=db.block_type,
                    content=db.content,
                    material_note_id=db.material_note_id,
                    quote_snapshot=mat_note.raw_quote or "",
                    interpretation_snapshot=mat_note.user_interpretation
                )
                referenced_material_count += 1
            domain_blocks.append(db)

        # 4. 生成聚合根
        note_id = f"syn_{id_worker.next_id_str()}"
        file_path = str((get_note_dir() / f"{note_id}.md").resolve())

        note = SynthesizedNote(
            project_id=dto.project_id,
            knowledge_base_id=dto.knowledge_base_id,
            title=dto.title,
            note_type=nt,
            file_path=file_path,
            summary=dto.title[:100],  # 简单截取标题前100字符作为摘要
            blocks=domain_blocks
        )
        note.id = note_id

        # 5. DB 保存与物理文件原子写入由领域状态服务内置处理
        await self.note_state_service.create_synthesized_note(note)

        return SynthesizedNoteVO(
            id=note.id,
            project_id=note.project_id,
            title=note.title,
            note_type=note.note_type.value,
            file_path=note.file_path,
            referenced_material_count=referenced_material_count,
            created_at=note.created_at.isoformat()
        )


class GetSynthesizedNoteUseCase:
    """获取单个沉淀笔记详情 UseCase"""

    def __init__(self, note_query_service: NoteQueryDomainService):
        self.note_query_service = note_query_service

    async def execute(self, note_id: str) -> SynthesizedNoteDetailVO:
        # 1. 取得完整领域实体（已包含从磁盘重构回的 blocks）
        note = await self.note_query_service.get_synthesized_note_by_id(note_id)
        if not note:
            raise DomainException(f"未找到指定的沉淀笔记: {note_id}", status_code=404)

        blocks_dto = [
            DocumentBlockDTO(
                block_id=b.block_id,
                block_type=b.block_type.value,
                content=b.content,
                material_note_id=b.material_note_id,
                quote_snapshot=b.quote_snapshot,
                interpretation_snapshot=b.interpretation_snapshot
            )
            for b in note.blocks
        ]

        return SynthesizedNoteDetailVO(
            id=note.id,
            project_id=note.project_id,
            knowledge_base_id=note.knowledge_base_id,
            title=note.title,
            note_type=note.note_type.value,
            file_path=note.file_path,
            blocks=blocks_dto,
            created_at=note.created_at.isoformat(),
            updated_at=note.updated_at.isoformat()
        )


class UpdateSynthesizedNoteUseCase:
    """更新沉淀笔记 UseCase"""

    def __init__(
        self,
        note_state_service: NoteStateDomainService,
        note_query_service: NoteQueryDomainService,
    ):
        self.note_state_service = note_state_service
        self.note_query_service = note_query_service

    async def execute(self, note_id: str, dto: UpdateSynthesizedNoteDTO) -> SynthesizedNoteVO:
        # 1. 校验存在性
        note = await self.note_query_service.get_synthesized_note_by_id(note_id)
        if not note:
            raise DomainException(f"沉淀笔记未找到: {note_id}", status_code=404)

        # 2. 转换为领域 Block 并校验关联素材合法性
        domain_blocks = []
        referenced_material_count = 0
        for b_dto in dto.blocks:
            db = DocumentBlock(
                block_id=b_dto.block_id or f"blk_{id_worker.next_id_str()}",
                block_type=BlockType(b_dto.block_type),
                content=b_dto.content,
                material_note_id=b_dto.material_note_id,
                quote_snapshot=b_dto.quote_snapshot,
                interpretation_snapshot=b_dto.interpretation_snapshot
            )
            if db.block_type == BlockType.MATERIAL_REF:
                if not db.material_note_id:
                    raise DomainException("素材引用 Block 必须提供 material_note_id", status_code=400)
                mat_note = await self.note_query_service.get_material_note_by_id(db.material_note_id)
                if not mat_note:
                    raise DomainException(f"引用的素材笔记不存在: {db.material_note_id}", status_code=404)
                
                # 同步快照以防前端修改了快照
                db = DocumentBlock(
                    block_id=db.block_id,
                    block_type=db.block_type,
                    content=db.content,
                    material_note_id=db.material_note_id,
                    quote_snapshot=mat_note.raw_quote or "",
                    interpretation_snapshot=mat_note.user_interpretation
                )
                referenced_material_count += 1
            domain_blocks.append(db)

        # 3. 更新实体信息
        note.title = dto.title
        note.blocks = domain_blocks
        note.updated_at = datetime.now(timezone.utc)
        
        # 4. 委托领域状态服务执行原子覆盖与 DB 保存
        await self.note_state_service.update_synthesized_note(note)

        return SynthesizedNoteVO(
            id=note.id,
            project_id=note.project_id,
            title=note.title,
            note_type=note.note_type.value,
            file_path=note.file_path,
            referenced_material_count=referenced_material_count,
            created_at=note.created_at.isoformat()
        )


class DeleteSynthesizedNoteUseCase:
    """删除沉淀笔记 UseCase"""

    def __init__(
        self,
        note_state_service: NoteStateDomainService,
    ):
        self.note_state_service = note_state_service

    async def execute(self, note_id: str) -> DeleteResponseVO:
        # 委托领域写服务完成文件物理擦除、关系表清理及删除事件广播
        res = await self.note_state_service.delete_synthesized_note(note_id)
        if not res:
            raise DomainException(f"要删除的笔记不存在: {note_id}", status_code=404)

        return DeleteResponseVO(id=note_id, deleted=True)


class UnbindKnowledgeBaseNotesUseCase:
    """知识库解绑 UseCase (跨领域防腐调用)"""

    def __init__(self, knowledge_service: KnowledgeBaseDomainService):
        self.knowledge_service = knowledge_service

    async def execute(self, kb_id: str) -> None:
        # 置空外键，绝不物理删除笔记 Markdown 原文
        await self.knowledge_service.delete_knowledge_base(kb_id)


class CorrectNoteAnchorUseCase:
    """纠正素材笔记高亮锚点坐标 UseCase"""

    def __init__(self, note_operation_service: NoteOperationDomainService):
        self.note_operation_service = note_operation_service

    async def execute(self, note_id: str, dto: SourceAnchorDTO) -> None:
        anchor = SourceAnchor(
            book_id=dto.book_id,
            chapter_id=dto.chapter_id,
            start_offset=dto.start_offset,
            end_offset=dto.end_offset,
            feature_text=dto.feature_text
        )
        try:
            await self.note_operation_service.correct_note_anchor(note_id, anchor)
        except KeyError as e:
            raise DomainException(str(e), status_code=404)
