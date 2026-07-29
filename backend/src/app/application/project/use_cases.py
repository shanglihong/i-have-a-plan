"""Project 领域应用层 UseCase 实现模块

仅负责接收请求、应用编排、调用 Domain Services 及 DTO 映射。
严禁直接依赖 RepositoryPort 或存储接口。
"""

from typing import Optional
from datetime import datetime
from fastapi import UploadFile, HTTPException, status

from app.domain.base import SortOrder
from app.domain.project.entities import ProjectStatus, ProjectType, ProjectSortBy
from app.domain.project.services import (
    ProjectStateDomainService,
    ProjectQueryDomainService,
    ExperienceNoteDomainService,
)
from app.utils.path import get_book_dir

from app.domain.book.services import (
    BookCreationDomainService,
    BookQueryDomainService,
)
from app.domain.book.entities import ParsingStatus
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
    ):
        self.creation_service = creation_service
        self.book_creation_service = book_creation_service

    async def create_plan_project(self, dto: CreatePlanProjectDTO) -> ProjectResponseDTO:
        project = await self.creation_service.create_plan_project(
            title=dto.title,
            deadline=dto.deadline,
            agent_id="" # TODO
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

        project = await self.creation_service.create_reading_project(
            project_id=project_id,
            title=title,
            deadline=deadline,
            book_id=book.id,
            agent_id="", # TODO
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

