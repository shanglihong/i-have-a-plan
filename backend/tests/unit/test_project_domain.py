"""
领域层单元测试 - 项目上下文

测试纯领域逻辑，不依赖任何外部基础设施（数据库、LLM、HTTP）。
验证 Project 实体状态流转、进度计算以及 validate_dag 依赖算法的正确性。
"""
from __future__ import annotations

import pytest
from datetime import datetime

from app.domain.project.entities import (
    Project,
    ProjectStatus,
    ProjectType,
    TaskChain,
    TaskChainType,
    Task,
    TaskStatus,
)
from app.domain.project.services import ProjectDomainService


class TestProjectLifecycle:
    """Project 实体三态生命周期与充血模型行为测试"""

    def test_project_status_transitions(self) -> None:
        p = Project(id="proj_1", title="测试项目", status=ProjectStatus.INIT)
        assert p.status == ProjectStatus.INIT

        # INIT -> ACTIVE
        p.transit_to_active()
        assert p.status == ProjectStatus.ACTIVE

        # ACTIVE -> ARCHIVED
        p.archive()
        assert p.status == ProjectStatus.ARCHIVED

        # ARCHIVED -> ACTIVE
        p.reactivate()
        assert p.status == ProjectStatus.ACTIVE

        # 非法转换断言
        with pytest.raises(ValueError):
            p.transit_to_active()

    def test_project_rich_domain_behaviors(self) -> None:
        """测试 bind_agent 与 attach_toc_tree 充血模型行为"""
        p = Project(id="proj_rich", title="充血测试", status=ProjectStatus.INIT)

        # 1. 绑定 Agent 句柄
        p.bind_agent("agent_sup_9999")
        assert p.assigned_agent_id == "agent_sup_9999"

        # 2. 挂载 Book 目录大纲树
        toc_nodes = [
            {"id": "toc_1", "title": "第一章 统一语言", "target_chapter_id": "chap_01"},
            {"id": "toc_2", "title": "第二章 限界上下文", "target_chapter_id": "chap_02"},
        ]
        p.attach_toc_tree(toc_nodes, book_id="bk_123456")
        assert p.book_id == "bk_123456"
        assert len(p.task_chains) == 2
        assert p.task_chains[0].title == "第一章 统一语言"
        assert p.task_chains[0].chapter_id == "chap_01"
        assert len(p.task_chains[0].tasks) == 1

    def test_add_retrospective_milestone(self) -> None:
        """测试追加复盘里程碑领域方法"""
        p = Project(id="proj_retro", title="复盘测试", status=ProjectStatus.ACTIVE)
        assert len(p.task_chains) == 0

        retro_chain = p.add_retrospective_milestone(
            title="复盘总结", description="总结经验"
        )
        assert len(p.task_chains) == 1
        assert retro_chain.chain_type == TaskChainType.RETROSPECTIVE
        assert retro_chain.title == "复盘总结"
        assert retro_chain.sequence_order == 1
        assert len(retro_chain.tasks) == 1
        assert retro_chain.tasks[0].title == "复盘总结"
        assert retro_chain.tasks[0].description == "总结经验"
        assert retro_chain.tasks[0].status == TaskStatus.PENDING



class TestDAGValidation:
    """Task 有向无环图 (DAG) 依赖测试"""

    def test_valid_dag(self) -> None:
        t1 = Task(id="t1", title="T1")
        t2 = Task(id="t2", title="T2", depends_on_task_ids=["t1"])
        t3 = Task(id="t3", title="T3", depends_on_task_ids=["t2"])

        assert ProjectDomainService.validate_dag([t1, t2, t3]) is True

    def test_cycle_dag_returns_false(self) -> None:
        t1 = Task(id="t1", title="T1", depends_on_task_ids=["t2"])
        t2 = Task(id="t2", title="T2", depends_on_task_ids=["t1"])

        assert ProjectDomainService.validate_dag([t1, t2]) is False


class TestProjectQueryDomainService:
    """ProjectQueryDomainService 强类型枚举参数测试"""

    @pytest.mark.asyncio
    async def test_list_projects_uses_enum_defaults(self) -> None:
        from unittest.mock import AsyncMock
        from app.domain.common.enums import SortOrder
        from app.domain.project.entities import ProjectSortBy
        from app.domain.project.services import ProjectQueryDomainService

        mock_project_repo = AsyncMock()
        mock_task_repo = AsyncMock()
        mock_book_repo = AsyncMock()
        mock_project_repo.list_projects.return_value = ([], 0)

        query_service = ProjectQueryDomainService(
            project_repo=mock_project_repo,
            task_repo=mock_task_repo,
            book_repo=mock_book_repo,
        )

        await query_service.list_projects()

        mock_project_repo.list_projects.assert_called_once_with(
            status=None,
            project_type=None,
            sort_by=ProjectSortBy.UPDATED_AT,
            order=SortOrder.DESC,
            page=1,
            size=20,
        )

    @pytest.mark.asyncio
    async def test_get_project_detail_fills_book_entity_for_reading_project(self) -> None:
        from unittest.mock import AsyncMock
        from app.domain.book.entities import Book, BookFileType
        from app.domain.project.entities import Project, ProjectType
        from app.domain.project.services import ProjectQueryDomainService

        mock_project_repo = AsyncMock()
        mock_task_repo = AsyncMock()
        mock_book_repo = AsyncMock()

        reading_project = Project(
            id="proj_reading",
            title="Reading DDD",
            project_type=ProjectType.READING,
            book_id="book_123",
        )
        sample_book = Book(id="book_123", project_id="proj_reading", file_name="ddd.epub", file_type=BookFileType.EPUB)

        mock_project_repo.get_by_id.return_value = reading_project
        mock_task_repo.get_task_chains_by_project_id.return_value = []
        mock_book_repo.find_by_id.return_value = sample_book

        query_service = ProjectQueryDomainService(
            project_repo=mock_project_repo,
            task_repo=mock_task_repo,
            book_repo=mock_book_repo,
        )

        res = await query_service.get_project_detail("proj_reading")

        assert res.book is not None
        assert res.book.id == "book_123"
        assert res.book.file_name == "ddd.epub"
        mock_book_repo.find_by_id.assert_called_once_with("book_123")


class TestProjectStateEvents:
    """Test ProjectStateDomainService 事件书包发布"""

    @pytest.mark.asyncio
    async def test_archive_and_reactivate_publish_events(self) -> None:
        from unittest.mock import AsyncMock
        from app.domain.project.entities import Project, ProjectStatus
        from app.domain.project.events import ProjectArchivedEvent, ProjectStatusChangedEvent
        from app.domain.project.services import ProjectStateDomainService

        mock_repo = AsyncMock()
        mock_task_repo = AsyncMock()
        mock_event_publisher = AsyncMock()

        p = Project(id="proj_events", title="Test Events", status=ProjectStatus.ACTIVE)
        mock_repo.get_by_id.return_value = p

        service = ProjectStateDomainService(
            project_repo=mock_repo,
            task_repo=mock_task_repo,
            event_publisher=mock_event_publisher,
        )

        # 归档项目
        await service.archive_project("proj_events")
        assert p.status == ProjectStatus.ARCHIVED
        assert mock_event_publisher.publish.call_count == 2
        events_1 = [call.args[0] for call in mock_event_publisher.publish.call_args_list]
        assert any(isinstance(e, ProjectArchivedEvent) and e.project_id == "proj_events" for e in events_1)
        assert any(
            isinstance(e, ProjectStatusChangedEvent)
            and e.project_id == "proj_events"
            and e.old_status == ProjectStatus.ACTIVE.value
            and e.new_status == ProjectStatus.ARCHIVED.value
            for e in events_1
        )

        # 重新激活项目
        mock_event_publisher.reset_mock()
        await service.reactivate_project("proj_events")
        assert p.status == ProjectStatus.ACTIVE
        assert mock_event_publisher.publish.call_count == 1
        events_2 = [call.args[0] for call in mock_event_publisher.publish.call_args_list]
        assert isinstance(events_2[0], ProjectStatusChangedEvent)
        assert events_2[0].project_id == "proj_events"
        assert events_2[0].old_status == ProjectStatus.ARCHIVED.value
        assert events_2[0].new_status == ProjectStatus.ACTIVE.value


class TestExperienceNoteDomainService:
    """Test ExperienceNoteDomainService 挂载复盘里程碑领域服务"""

    @pytest.mark.asyncio
    async def test_create_experience_note_attaches_retrospective_milestone(self) -> None:
        from unittest.mock import AsyncMock
        from app.domain.project.entities import Project, ProjectStatus, TaskChainType
        from app.domain.project.services import ExperienceNoteDomainService

        mock_project_repo = AsyncMock()
        mock_task_repo = AsyncMock()

        p = Project(id="proj_note_test", title="Note Test", status=ProjectStatus.ACTIVE)
        mock_project_repo.get_by_id.return_value = p
        mock_task_repo.get_task_chains_by_project_id.return_value = []

        service = ExperienceNoteDomainService(
            repository=mock_project_repo,
            task_repository=mock_task_repo,
        )

        proj_id, retro_chain_id = await service.create_experience_note(
            project_id="proj_note_test",
            content="实战经验心得",
            title="结项复盘",
        )

        assert proj_id == "proj_note_test"
        assert retro_chain_id == f"chain_retro_proj_note_test"
        assert len(p.task_chains) == 1
        assert p.task_chains[0].chain_type == TaskChainType.RETROSPECTIVE
        assert p.task_chains[0].title == "结项复盘"
        assert p.task_chains[0].tasks[0].description == "实战经验心得"

        mock_task_repo.save_task_chains.assert_called_once_with("proj_note_test", p.task_chains)
        mock_project_repo.save.assert_called_once_with(p)




