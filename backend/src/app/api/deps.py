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
    creation_service = BookCreationDomainService(repository)

    return {
        "parse_use_case": ParseBookUseCase(repository, file_storage, parsing_engine),
        "create_book_use_case": CreateBookUseCase(creation_service),
        "get_metadata_use_case": GetBookMetadataUseCase(repository),
        "get_toc_use_case": GetBookTocUseCase(toc_query_service),
        "get_content_use_case": GetChapterContentUseCase(content_query_service),
        "healing_use_case": BookHealingUseCase(healing_service)
    }

