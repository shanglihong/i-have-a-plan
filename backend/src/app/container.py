"""全局 Composition Root 依赖注入容器 (AppContainer)

集中组装应用层用例、领域层服务以及基础设施层仓储适配器。
作为 API 路由、Event Consumer 以及 App Lifespan 的统一依赖供给中心。
"""

from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.repositories.knowledge_repository import KnowledgeRepository
# 基础设施层
from app.infrastructure.db.repositories.project_repository import ProjectRepository
from app.infrastructure.db.repositories.task_repository import TaskRepository, NoteAttachmentRepositoryAdapter
from app.infrastructure.db.repositories.book_repository import BookRepositoryAdapter
from app.infrastructure.db.repositories.note_repository import NoteRepositoryAdapter
from app.infrastructure.db.repositories.agent_repository import InMemoryAgentRepositoryAdapter
from app.infrastructure.db.repositories.graph_repository import (
    SQLiteGraphRepositoryAdapter,
    SQLiteVectorStoreRepositoryAdapter,
)
from app.infrastructure.file_storage.book_storage import LocalBookFileStorageAdapter
from app.infrastructure.file_storage.note_storage import LocalNoteFileStorageAdapter
from app.infrastructure.event_bus.asyncio_event_bus import global_event_bus
from app.infrastructure.llm.langchain_llm_service import LangChainLLMService

# 领域层服务
from app.domain.graph.service import (
    GraphQueryDomainService,
    GraphStateDomainService,
    GraphOperationDomainService,
)
from app.domain.agent.service import (
    AgentChatDomainService,
    AgentStateService,
    AgentQueryDomainService,
    AgentCardDomainService,
)
from app.application.agent.use_cases import AgentChatUseCase, AgentQueryUseCase
from app.infrastructure.adapters import (
    TaskOperationProjectTaskAdapter,
    BookQueryDomainAdapter,
)
from app.domain.note.service import (
    NoteQueryDomainService,
    NoteStateDomainService,
    NoteOperationDomainService,
    KnowledgeBaseDomainService,
)
from app.domain.book.services import (
    BookParsingEngineService,
    BookQueryDomainService,
    BookChapterContentDomainService,
    BookCreationDomainService,
)
from app.domain.project.services import (
    ProjectStateDomainService,
    ProjectQueryDomainService,
    ExperienceNoteDomainService,
    TaskOperationDomainService,
)
from app.domain.project.services.task_state_service import TaskStateDomainService
from app.domain.project.services.task_query_service import TaskQueryDomainService

# 应用层用例
from app.application.book import (
    GetBookMetadataUseCase,
    GetBookTocUseCase,
    GetChapterContentUseCase,
    CreateBookUseCase,
)
from app.application.project.use_cases import (
    CreateProjectUseCase,
    ProjectQueryUseCase,
    ManageProjectStateUseCase,
    CreateExperienceNoteUseCase,
    CompletePlanTaskTreeUseCase,
    MountBookTaskTreeUseCase,
)
from app.application.project.task_use_cases import (
    GetTaskTreeUseCase,
    TaskQueryUseCase,
    ManageTaskTreeUseCase,
    ChangeTaskStatusUseCase,
    TaskStatusProgressUseCase,
    TaskNoteAttachmentUseCase,
)
from app.application.note import (
    CreateMaterialNoteUseCase,
    GetMaterialNotesUseCase,
    CreateSynthesizedNoteUseCase,
    GetSynthesizedNoteUseCase,
    UpdateSynthesizedNoteUseCase,
    DeleteSynthesizedNoteUseCase,
    UnbindKnowledgeBaseNotesUseCase,
    CorrectNoteAnchorUseCase,
)


class AppContainer:
    """全局 Composition Root 依赖注入容器"""

    def __init__(self, session: AsyncSession):
        self.session = session

        # 1. 基础设施层适配器与仓储 (Repositories & Adapters)
        self.project_repo = ProjectRepository(session)
        self.task_repo = TaskRepository(session)
        self.book_repo = BookRepositoryAdapter(session)
        self.note_repo = NoteRepositoryAdapter(session)
        self.kb_repo = KnowledgeRepository(session)
        self.note_attachment_repo = NoteAttachmentRepositoryAdapter(session)
        self.graph_repo = SQLiteGraphRepositoryAdapter(session)
        self.vector_store = SQLiteVectorStoreRepositoryAdapter(session)
        self.file_storage = LocalBookFileStorageAdapter()
        self.note_file_storage = LocalNoteFileStorageAdapter()
        self.event_bus = global_event_bus

        # 2. 图书领域服务 (Book Domain Services)
        self.parsing_engine = BookParsingEngineService(
            repository=self.book_repo,
            file_storage=self.file_storage,
            event_bus=self.event_bus,
        )
        self.book_service = BookQueryDomainService(repository=self.book_repo)
        self.book_content_service = BookChapterContentDomainService(
            repository=self.book_repo,
            file_storage=self.file_storage,
        )
        self.book_creation_service = BookCreationDomainService(
            repository=self.book_repo,
            event_publisher=self.event_bus,
        )

        # 3. 项目领域服务 (Project Domain Services)
        self.project_state_service = ProjectStateDomainService(
            project_repo=self.project_repo,
            task_repo=self.task_repo,
            event_publisher=self.event_bus,
        )
        self.project_creation_service = self.project_state_service
        self.project_query_service = ProjectQueryDomainService(
            project_repo=self.project_repo,
            task_repo=self.task_repo,
        )
        self.project_note_service = ExperienceNoteDomainService(
            repository=self.project_repo,
            task_repository=self.task_repo,
            event_publisher=self.event_bus,
        )
        self.task_op_service = TaskOperationDomainService(
            project_repo=self.project_repo,
            task_repo=self.task_repo,
            note_attachment_repo=self.note_attachment_repo,
            event_publisher=self.event_bus,
        )
        self.task_state_service = TaskStateDomainService(
            project_repo=self.project_repo,
            task_repo=self.task_repo,
            event_publisher=self.event_bus,
        )
        self.task_query_service = TaskQueryDomainService(
            task_repo=self.task_repo,
            note_attachment_repo=self.note_attachment_repo,
        )
        self.note_file_storage = LocalNoteFileStorageAdapter()
        self.note_query_service = NoteQueryDomainService(
            material_repo=self.note_repo,
            synthesized_repo=self.note_repo,
            file_storage_port=self.note_file_storage,
        )
        self.note_state_service = NoteStateDomainService(
            material_repo=self.note_repo,
            synthesized_repo=self.note_repo,
            file_storage_port=self.note_file_storage,
            event_publisher=self.event_bus,
        )
        self.note_operation_service = NoteOperationDomainService(
            material_repo=self.note_repo,
            file_storage_port=self.note_file_storage,
            synthesized_repo=self.note_repo,
        )
        self.knowledge_base_service = KnowledgeBaseDomainService(
            kb_repo=self.kb_repo,
            synthesized_repo=self.note_repo,
        )

        # 4. Agent 领域服务与应用 UseCases
        self.agent_repo = InMemoryAgentRepositoryAdapter()
        self.llm_service = LangChainLLMService()
        self.agent_card_service = AgentCardDomainService(llm_service=self.llm_service)
        self.agent_chat_service = AgentChatDomainService(
            repository=self.agent_repo,
            llm_service=self.llm_service,
            tool_book_query=BookQueryDomainAdapter(
                chapter_content_service=self.book_content_service,
            ),
            tool_project_task_port=TaskOperationProjectTaskAdapter(self.task_op_service),
        )
        self.agent_chat_use_case = AgentChatUseCase(
            repository=self.agent_repo,
            llm_service=self.llm_service,
            tool_book_query=BookQueryDomainAdapter(
                chapter_content_service=self.book_content_service,
            ),
            tool_project_task_port=TaskOperationProjectTaskAdapter(self.task_op_service),
            card_service=self.agent_card_service,
        )
        self.agent_state_service = AgentStateService(
            repository=self.agent_repo,
            event_publisher=self.event_bus,
        )
        self.agent_query_service = AgentQueryDomainService(
            repository=self.agent_repo,
            llm_service=self.llm_service,
        )
        self.agent_query_use_case = AgentQueryUseCase(
            repository=self.agent_repo,
            llm_service=self.llm_service,
        )

        # 5. Graph 旁路图谱领域服务 (Graph Domain Services)
        self.graph_query_service = GraphQueryDomainService(graph_repo=self.graph_repo)
        self.graph_state_service = GraphStateDomainService(
            graph_repo=self.graph_repo, vector_store=self.vector_store
        )
        self.graph_sync_service = GraphOperationDomainService(
            graph_repo=self.graph_repo,
            vector_store=self.vector_store,
            llm_extractor=self.llm_service,
        )

    def get_agent_use_cases(self) -> Dict[str, Any]:
        """打包并提供 REST API 层使用的 Agent 领域用例/服务字典"""
        return {
            "agent_chat_service": self.agent_chat_service,
            "agent_chat_use_case": self.agent_chat_use_case,
            "agent_card_service": self.agent_card_service,
            "agent_state_service": self.agent_state_service,
            "agent_query_service": self.agent_query_service,
            "agent_query_use_case": self.agent_query_use_case,
        }


    def get_book_use_cases(self) -> Dict[str, Any]:
        """打包并提供 REST API 层使用的 Book 领域用例字典"""
        return {
            "create_book_use_case": CreateBookUseCase(self.book_creation_service),
            "get_metadata_use_case": GetBookMetadataUseCase(self.book_repo),
            "get_toc_use_case": GetBookTocUseCase(self.book_service),
            "get_content_use_case": GetChapterContentUseCase(self.book_content_service),
        }

    def get_project_use_cases(self) -> Dict[str, Any]:
        """打包并提供 REST API 层使用的 Project 领域用例字典"""
        return {
            "create_use_case": CreateProjectUseCase(
                self.project_creation_service,
                book_creation_service=self.book_creation_service,
                agent_state_service=self.agent_state_service,
            ),
            "query_use_case": ProjectQueryUseCase(self.project_query_service, self.book_service),
            "manage_state_use_case": ManageProjectStateUseCase(self.project_state_service),
            "create_note_use_case": CreateExperienceNoteUseCase(self.project_note_service),
            "complete_tree_use_case": CompletePlanTaskTreeUseCase(
                self.project_state_service,
                self.project_query_service,
            ),
            "mount_book_task_tree_use_case": MountBookTaskTreeUseCase(
                self.book_service,
                self.task_op_service,
            ),
        }

    def get_task_use_cases(self) -> Dict[str, Any]:
        """打包并提供 REST API 层使用的 Task 领域用例字典"""
        return {
            "get_tree_use_case": GetTaskTreeUseCase(self.project_query_service),
            "query_use_case": TaskQueryUseCase(self.project_query_service),
            "manage_tree_use_case": ManageTaskTreeUseCase(self.task_op_service, self.task_state_service),
            "change_status_use_case": ChangeTaskStatusUseCase(self.task_state_service),
            "progress_use_case": TaskStatusProgressUseCase(self.task_state_service),
            "note_attachment_use_case": TaskNoteAttachmentUseCase(
                self.task_query_service,
                self.task_op_service,
                self.note_query_service,
                self.note_state_service,
            ),
        }

    def get_note_use_cases(self) -> Dict[str, Any]:
        """打包并提供 REST API 层使用的 Note 领域用例字典"""
        return {
            "create_material_use_case": CreateMaterialNoteUseCase(
                self.note_state_service,
                self.book_content_service,
                self.project_query_service,
                self.task_query_service
            ),
            "get_material_use_case": GetMaterialNotesUseCase(self.note_query_service),
            "create_synthesized_use_case": CreateSynthesizedNoteUseCase(
                self.note_state_service,
                self.note_query_service,
                self.project_query_service
            ),
            "get_synthesized_use_case": GetSynthesizedNoteUseCase(
                self.note_query_service
            ),
            "update_synthesized_use_case": UpdateSynthesizedNoteUseCase(
                self.note_state_service,
                self.note_query_service
            ),
            "delete_synthesized_use_case": DeleteSynthesizedNoteUseCase(
                self.note_state_service
            ),
            "unbind_kb_use_case": UnbindKnowledgeBaseNotesUseCase(self.knowledge_base_service),
            "correct_anchor_use_case": CorrectNoteAnchorUseCase(
                self.note_operation_service
            ),
        }
