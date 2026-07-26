"""
接入层 - FastAPI 依赖注入定义 (Depends)

集中管理所有 FastAPI Depends 函数，避免路由文件直接耦合基础设施层。
测试时通过 app.dependency_overrides 替换 Mock 实现。
"""
from __future__ import annotations

from typing import Annotated, AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.session import get_async_session
from app.infrastructure.db.repositories.book_repository import BookRepositoryAdapter
from app.infrastructure.file_storage.book_storage import LocalBookFileStorageAdapter
from app.infrastructure.event_bus.asyncio_event_bus import global_event_bus
from app.domain.book.services import (
    BookParsingEngineService,
    BookHealingDomainService,
    BookTocQueryDomainService,
    BookChapterContentDomainService,
    BookCreationDomainService
)
from app.application.book.use_cases import (
    ParseBookUseCase,
    GetBookMetadataUseCase,
    GetBookTocUseCase,
    GetChapterContentUseCase,
    BookHealingUseCase,
    CreateBookUseCase
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """提供数据库 Session, 每次请求独立"""
    async for session in get_async_session():
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_db_session)]


async def get_book_use_cases(session: AsyncSession = Depends(get_async_session)) -> dict:
    """构建与提供 Book 领域用例组依赖"""
    repository = BookRepositoryAdapter(session)
    file_storage = LocalBookFileStorageAdapter()

    parsing_engine = BookParsingEngineService(repository, file_storage, global_event_bus)
    healing_service = BookHealingDomainService(repository, file_storage, parsing_engine)
    toc_query_service = BookTocQueryDomainService(repository)
    content_query_service = BookChapterContentDomainService(repository, file_storage)
    creation_service = BookCreationDomainService(repository, event_publisher=global_event_bus)

    return {
        "parse_use_case": ParseBookUseCase(repository, file_storage, parsing_engine),
        "create_book_use_case": CreateBookUseCase(creation_service),
        "get_metadata_use_case": GetBookMetadataUseCase(repository),
        "get_toc_use_case": GetBookTocUseCase(toc_query_service),
        "get_content_use_case": GetChapterContentUseCase(content_query_service),
        "healing_use_case": BookHealingUseCase(healing_service)
    }


async def get_project_use_cases(session: AsyncSession = Depends(get_async_session)) -> dict:
    """构建与提供 Project 领域用例组依赖 (组合 Domain Services, Agent Adapter 与分离的仓储)"""
    from app.infrastructure.db.repositories.project_repository import ProjectRepository
    from app.infrastructure.db.repositories.task_repository import TaskRepository
    from app.infrastructure.adapters.agent_adapter import AgentDomainAdapter
    from app.domain.project.services import (
        ProjectCreationDomainService,
        ProjectStateDomainService,
        ProjectQueryDomainService,
        ExperienceNoteDomainService,
    )
    from app.application.project.use_cases import (
        CreateProjectUseCase,
        ProjectQueryUseCase,
        ManageProjectStateUseCase,
        CreateExperienceNoteUseCase,
        CompletePlanTaskTreeUseCase,
    )

    from app.infrastructure.db.repositories.book_repository import BookRepositoryAdapter
    from app.domain.book.services import BookCreationDomainService

    project_repository = ProjectRepository(session)
    task_repository = TaskRepository(session)
    agent_adapter = AgentDomainAdapter()
    book_repository = BookRepositoryAdapter(session)

    creation_service = ProjectCreationDomainService(project_repository, task_repository, agent_adapter)
    book_creation_service = BookCreationDomainService(book_repository, event_publisher=global_event_bus)
    state_service = ProjectStateDomainService(project_repository, task_repository, event_publisher=global_event_bus)
    query_service = ProjectQueryDomainService(project_repository, task_repository, book_repo=book_repository)
    note_service = ExperienceNoteDomainService(project_repository)

    return {
        "create_use_case": CreateProjectUseCase(creation_service, book_creation_service=book_creation_service),
        "query_use_case": ProjectQueryUseCase(query_service),
        "manage_state_use_case": ManageProjectStateUseCase(state_service),
        "create_note_use_case": CreateExperienceNoteUseCase(note_service),
        "complete_tree_use_case": CompletePlanTaskTreeUseCase(state_service, query_service),
    }





