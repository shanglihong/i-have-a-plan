"""全局 Composition Root 依赖注入容器 (AppContainer)

集中组装应用层用例、领域层服务以及基础设施层仓储适配器。
作为 API 路由、Event Consumer 以及 App Lifespan 的统一依赖供给中心。
"""

from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

# 基础设施层
from app.infrastructure.db.repositories.project_repository import ProjectRepository
from app.infrastructure.db.repositories.task_repository import TaskRepository
from app.infrastructure.db.repositories.book_repository import BookRepositoryAdapter
from app.infrastructure.file_storage.book_storage import LocalBookFileStorageAdapter
from app.infrastructure.adapters.agent_adapter import AgentDomainAdapter
from app.infrastructure.event_bus.asyncio_event_bus import global_event_bus

# 领域层服务
from app.domain.book.services import (
    BookParsingEngineService,
    BookHealingDomainService,
    BookTocQueryDomainService,
    BookChapterContentDomainService,
    BookCreationDomainService,
)
from app.domain.project.services import (
    ProjectCreationDomainService,
    ProjectStateDomainService,
    ProjectQueryDomainService,
    ExperienceNoteDomainService,
    TaskOperationDomainService,
)
from app.domain.project.services.healing import StartupHealingThread

# 应用层用例
from app.application.book.use_cases import (
    ParseBookUseCase,
    GetBookMetadataUseCase,
    GetBookTocUseCase,
    GetChapterContentUseCase,
    BookHealingUseCase,
    CreateBookUseCase,
)
from app.application.project.use_cases import (
    CreateProjectUseCase,
    ProjectQueryUseCase,
    ManageProjectStateUseCase,
    CreateExperienceNoteUseCase,
    CompletePlanTaskTreeUseCase,
)


class AppContainer:
    """全局 Composition Root 依赖注入容器"""

    def __init__(self, session: AsyncSession):
        self.session = session

        # 1. 基础设施层适配器与仓储 (Repositories & Adapters)
        self.project_repo = ProjectRepository(session)
        self.task_repo = TaskRepository(session)
        self.book_repo = BookRepositoryAdapter(session)
        self.file_storage = LocalBookFileStorageAdapter()
        self.event_bus = global_event_bus
        self.agent_adapter = AgentDomainAdapter()

        # 2. 图书领域服务 (Book Domain Services)
        self.parsing_engine = BookParsingEngineService(
            repository=self.book_repo,
            file_storage=self.file_storage,
            event_bus=self.event_bus,
        )
        self.book_healing_service = BookHealingDomainService(
            repository=self.book_repo,
            file_storage=self.file_storage,
            parsing_engine=self.parsing_engine,
        )
        self.book_toc_service = BookTocQueryDomainService(repository=self.book_repo)
        self.book_content_service = BookChapterContentDomainService(
            repository=self.book_repo,
            file_storage=self.file_storage,
        )
        self.book_creation_service = BookCreationDomainService(
            repository=self.book_repo,
            event_publisher=self.event_bus,
        )

        # 3. 项目领域服务 (Project Domain Services)
        self.project_creation_service = ProjectCreationDomainService(
            project_repo=self.project_repo,
            task_repo=self.task_repo,
            agent_port=self.agent_adapter,
        )
        self.project_state_service = ProjectStateDomainService(
            project_repo=self.project_repo,
            task_repo=self.task_repo,
            event_publisher=self.event_bus,
        )
        self.project_query_service = ProjectQueryDomainService(
            project_repo=self.project_repo,
            task_repo=self.task_repo,
            book_repo=self.book_repo,
        )
        self.project_note_service = ExperienceNoteDomainService(
            repository=self.project_repo,
            task_repository=self.task_repo,
        )
        self.project_healing_thread = StartupHealingThread(
            project_repo=self.project_repo,
            task_repo=self.task_repo,
        )
        self.task_op_service = TaskOperationDomainService(
            project_repo=self.project_repo,
            task_repo=self.task_repo,
            book_toc_service=self.book_toc_service,
            event_publisher=self.event_bus,
        )

    def get_book_use_cases(self) -> Dict[str, Any]:
        """打包并提供 REST API 层使用的 Book 领域用例字典"""
        return {
            "create_book_use_case": CreateBookUseCase(self.book_creation_service),
            "get_metadata_use_case": GetBookMetadataUseCase(self.book_repo),
            "get_toc_use_case": GetBookTocUseCase(self.book_toc_service),
            "get_content_use_case": GetChapterContentUseCase(self.book_content_service),
            "healing_use_case": BookHealingUseCase(self.book_healing_service),
        }

    def get_project_use_cases(self) -> Dict[str, Any]:
        """打包并提供 REST API 层使用的 Project 领域用例字典"""
        return {
            "create_use_case": CreateProjectUseCase(
                self.project_creation_service,
                book_creation_service=self.book_creation_service,
            ),
            "query_use_case": ProjectQueryUseCase(self.project_query_service),
            "manage_state_use_case": ManageProjectStateUseCase(self.project_state_service),
            "create_note_use_case": CreateExperienceNoteUseCase(self.project_note_service),
            "complete_tree_use_case": CompletePlanTaskTreeUseCase(
                self.project_state_service,
                self.project_query_service,
            ),
        }
