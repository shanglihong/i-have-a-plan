"""Project 领域应用层 UseCase 实现模块

仅负责接收请求、应用编排、调用 Domain Services 及 DTO 映射。
严禁直接依赖 RepositoryPort 或存储接口。
"""

import logging
from app.domain.agent import AgentMode
from app.domain.agent import AgentStateService
from typing import Optional, List
from datetime import datetime
from fastapi import UploadFile, HTTPException, status

from app.domain.base import SortOrder
from app.domain.project.entities import (
    ProjectStatus,
    ProjectType,
    ProjectSortBy,
    TaskChain,
    Task,
    TaskChainType,
    TaskStatus,
)
from app.domain.project.services import (
    ProjectStateDomainService,
    ProjectQueryDomainService,
    ExperienceNoteDomainService,
    TaskOperationDomainService,
)
from app.utils.path import get_book_dir

from app.domain.book.services import (
    BookCreationDomainService,
    BookQueryDomainService,
)
from app.domain.book.entities import ParsingStatus, TocNode

logger = logging.getLogger(__name__)
from app.application.project.dtos import (
    CreatePlanProjectDTO,
    UpdateProjectDTO,
    CreateExperienceNoteDTO,
    ProjectResponseDTO,
    ProjectListItemDTO,
    ProjectListResponseDTO,
    ProjectDetailDTO,
    BookSummaryDTO,
    ExperienceNoteResponseDTO,
)
from app.utils.snow import id_worker


async def _save_uploaded_file(
        project_id: str, file: UploadFile
) -> tuple[bytes, str, str]:
    """保存上传物理文件，返回 (file_bytes, filename, storage_path)"""
    file_bytes = await file.read()
    filename = file.filename or "err.txt"

    book_dir = get_book_dir(project_id)
    book_dir.mkdir(parents=True, exist_ok=True)

    target_path = book_dir / filename
    target_path.write_bytes(file_bytes)
    return file_bytes, filename, str(target_path)


class CreateProjectUseCase:
    """创建双轨项目 UseCase"""

    def __init__(
        self,
        creation_service: ProjectStateDomainService,
        book_creation_service: BookCreationDomainService,
        agent_state_service: AgentStateService,
    ):
        self.creation_service = creation_service
        self.book_creation_service = book_creation_service
        self.agent_state_service = agent_state_service

    async def create_plan_project(self, dto: CreatePlanProjectDTO) -> ProjectResponseDTO:
        project_id = f"proj_{id_worker.next_id_str()}"
        session = await self.agent_state_service.create_agent_session(project_id=project_id, mode=AgentMode.TASK_BREAKDOWN, skill_id=dto.skill_id)
        project = await self.creation_service.create_plan_project(
            project_id=project_id,
            title=dto.title,
            deadline=dto.deadline,
            agent_id=session.agent_id,
        )
        return ProjectResponseDTO.from_domain(project)

    async def create_reading_project(
        self,
        title: str,
        deadline: Optional[datetime] = None,
        file: Optional[UploadFile] = None,
    ) -> ProjectResponseDTO:
        file_bytes = b""
        filename = file.filename if (file and file.filename) else f"{title}.pdf"
        storage_path: Optional[str] = None
        project_id = f"proj_{id_worker.next_id_str()}"

        if file:
            file_bytes, filename, storage_path = await _save_uploaded_file(project_id, file)

        book = await self.book_creation_service.create_book(
            project_id=project_id,
            file_name=filename,
            file_type=self._infer_file_type(filename),
            file_size=len(file_bytes),
            storage_path=storage_path or "",
        )

        session = await self.agent_state_service.create_agent_session(project_id=project_id, mode=AgentMode.READING_COMPANION)
        project = await self.creation_service.create_reading_project(
            project_id=project_id,
            title=title,
            deadline=deadline,
            book_id=book.id,
            agent_id=session.agent_id,
        )

        return ProjectResponseDTO.from_domain(
            project,
            parsing_status=ParsingStatus.PENDING,
            storage_path=storage_path,
        )

    @staticmethod
    def _infer_file_type(filename: str) -> str:
        """从文件名推导 BookFileType 格式"""
        ext = filename.rsplit(".", 1)[-1].upper() if "." in filename else ""
        return ext



class ProjectQueryUseCase:
    """项目查询 UseCase"""

    def __init__(
            self,
            query_service: ProjectQueryDomainService,
            book_query_service: BookQueryDomainService,
    ):
        self.query_service = query_service
        self.book_query_service = book_query_service

    async def list_projects(
        self,
        status_filter: Optional[str] = None,
        type_filter: Optional[str] = None,
        sort_by: ProjectSortBy = ProjectSortBy.UPDATED_AT,
        order: SortOrder = SortOrder.DESC,
        page: int = 1,
        size: int = 20,
    ) -> ProjectListResponseDTO:
        p_status = ProjectStatus(status_filter) if status_filter else None
        p_type = ProjectType(type_filter) if type_filter else None
        p_sort_by = ProjectSortBy(sort_by) if isinstance(sort_by, str) else sort_by
        p_order = SortOrder(order) if isinstance(order, str) else order

        projects, total = await self.query_service.list_projects(
            status=p_status,
            project_type=p_type,
            sort_by=p_sort_by,
            order=p_order,
            page=page,
            size=size,
        )

        items = [ProjectListItemDTO.from_domain(p) for p in projects]
        has_next = (page * size) < total

        return ProjectListResponseDTO(
            items=items,
            total=total,
            page=page,
            size=size,
            has_next=has_next,
        )

    async def get_project_detail(self, project_id: str) -> ProjectDetailDTO:
        try:
            project = await self.query_service.get_project_detail(project_id)
            book = await self.book_query_service.get_book_by_id(project.book_id or "")
        except KeyError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        book_summary = None
        if book:
            book_summary = BookSummaryDTO(
                id=book.id,
                file_name=book.file_name,
                parsing_status=book.parsing_status,
                total_chapters=len(project.task_chains),
                total_word_count=getattr(book, "word_count", 0),
            )
        elif project.book_id:
            book_summary = BookSummaryDTO(
                id=project.book_id,
                file_name="",
                parsing_status=ParsingStatus.COMPLETED if project.status == ProjectStatus.ACTIVE else ParsingStatus.PENDING,
                total_chapters=len(project.task_chains),
                total_word_count=0,
            )

        return ProjectDetailDTO.from_domain(project, book_summary=book_summary)


class ManageProjectStateUseCase:
    """项目生命周期状态管理 UseCase"""

    def __init__(self, state_service: ProjectStateDomainService):
        self.state_service = state_service

    async def update_project_metadata(
        self, project_id: str, dto: UpdateProjectDTO
    ) -> ProjectResponseDTO:
        try:
            project = await self.state_service.update_metadata(
                project_id=project_id,
                title=dto.title,
                deadline=dto.deadline,
            )
            return ProjectResponseDTO.from_domain(project)
        except KeyError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

    async def archive_project(self, project_id: str) -> ProjectResponseDTO:
        try:
            project = await self.state_service.archive_project(project_id)
            return ProjectResponseDTO.from_domain(project)
        except KeyError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e),
            )


    async def reactivate_project(self, project_id: str) -> ProjectResponseDTO:
        try:
            project = await self.state_service.reactivate_project(project_id)
            return ProjectResponseDTO.from_domain(project)
        except KeyError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e),
            )


class CreateExperienceNoteUseCase:
    """归档项目生成经验笔记 UseCase"""

    def __init__(self, note_service: ExperienceNoteDomainService):
        self.note_service = note_service

    async def create_experience_note(
        self, project_id: str, dto: CreateExperienceNoteDTO
    ) -> ExperienceNoteResponseDTO:
        try:
            p_id, note_id = await self.note_service.create_experience_note(
                project_id=project_id,
                content=dto.experience_content or "",
            )

            return ExperienceNoteResponseDTO(
                project_id=p_id,
                experience_note_id=note_id,
            )
        except KeyError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )



class CompletePlanTaskTreeUseCase:
    """计划项目 Agent 对话建树完成 UseCase"""

    def __init__(
        self,
        state_service: ProjectStateDomainService,
        query_service: ProjectQueryDomainService,
    ):
        self.state_service = state_service
        self.query_service = query_service

    async def complete_tree(
        self, project_id: str, generated_chains: list
    ) -> ProjectResponseDTO:
        try:
            project = await self.query_service.get_project_detail(project_id)
            project.attach_task_tree(generated_chains)
            project.transit_to_active()
            await self.state_service.project_repo.save(project)
            if project.task_chains:
                await self.state_service.task_repo.save_task_chains(project.id, project.task_chains)
            return ProjectResponseDTO.from_domain(project)
        except KeyError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e),
            )


class MountBookTaskTreeUseCase:
    """电子书解析完成后自动构建大纲并挂载激活项目 UseCase"""

    def __init__(
        self,
        book_service: BookQueryDomainService,
        task_op_service: TaskOperationDomainService,
    ):
        self.book_service = book_service
        self.task_op_service = task_op_service

    async def execute(self, project_id: str, book_id: str) -> None:
        """从图书查询大纲树，转换为 TaskChain 并完成挂载与项目激活"""
        toc_tree: List[TocNode] = []
        try:
            _, toc_tree = await self.book_service.get_toc_tree(book_id)
        except Exception as e:
            logger.error(f"获取 Book 大纲树失败 (book_id={book_id}): {e}", exc_info=True)

        task_chains = self._build_task_chains_from_toc_tree(
            project_id=project_id,
            book_id=book_id,
            toc_tree=toc_tree,
        )
        await self.task_op_service.mount_task_tree_and_activate(
            project_id=project_id,
            task_chains=task_chains,
        )

    @staticmethod
    def _build_task_chains_from_toc_tree(
        project_id: str, book_id: str, toc_tree: List[TocNode]
    ) -> List[TaskChain]:
        """根据 Book 目录大纲树构建 READING_CHAPTER 领域任务链列表"""
        chains: List[TaskChain] = []

        for idx, node in enumerate(toc_tree, start=1):
            chain_id = f"chain_{node.id or idx}"
            chapter_id = node.target_chapter_id or f"chap_{idx:02d}"
            title = node.title or f"第 {idx} 章"

            read_task = Task(
                id=f"task_{chapter_id}_read",
                title=f"精读 {title}",
                description="完成对应章节正文切片阅读",
                sequence_order=1,
                status=TaskStatus.PENDING,
            )

            chain = TaskChain(
                id=chain_id,
                project_id=project_id,
                title=title,
                chain_type=TaskChainType.READING_CHAPTER,
                sequence_order=idx,
                status=TaskStatus.PENDING,
                book_id=book_id,
                chapter_id=chapter_id,
                tasks=[read_task],
            )
            chains.append(chain)

        return chains

