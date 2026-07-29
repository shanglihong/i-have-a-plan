"""Task 模块应用层 UseCases 单元集成测试"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.domain.project.entities import Task, TaskChain, TaskStatus, Project, ProjectStatus, ProjectType
from app.domain.project.exceptions import (
    CyclicDependencyException,
    TaskBlockedException,
    TaskNotFoundException,
    InvalidTaskStateTransitionException,
    DuplicateNoteAttachmentException,
)
from app.application.project.task_dtos import (
    CreateTaskDTO,
    CreateTaskChainDTO,
    UpdateTaskStatusDTO,
    CreateOrAttachTaskNoteDTO,
    TaskQueryFilterDTO,
)
from app.application.project.task_use_cases import (
    GetTaskTreeUseCase,
    TaskQueryUseCase,
    ManageTaskTreeUseCase,
    ChangeTaskStatusUseCase,
    TaskStatusProgressUseCase,
    TaskNoteAttachmentUseCase,
)
from app.domain.project.services.task_operation_service import TaskOperationDomainService
from app.domain.project.services.task_state_service import TaskStateDomainService
from app.domain.project.services.task_note_attachment_service import TaskNoteAttachmentDomainService

from app.domain.note.entities import MaterialNote


@pytest.mark.asyncio
async def test_get_task_tree_use_case() -> None:
    """测试 GetTaskTreeUseCase 是否正确读取并组装任务树及项目进度"""
    task_repo = MagicMock()
    
    t1 = Task(id="t1", title="Task 1", status=TaskStatus.COMPLETED)
    t2 = Task(id="t2", title="Task 2", status=TaskStatus.PENDING)
    chain = TaskChain(
        id="c1",
        title="Chain 1",
        tasks=[t1, t2],
        progress=0.0
    )
    
    project_query_service = MagicMock()
    project = Project(id="proj_1", task_chains=[chain])
    project_query_service.get_project_detail = AsyncMock(return_value=project)
    
    uc = GetTaskTreeUseCase(project_query_service)
    res = await uc.execute("proj_1")
    
    assert res.project_id == "proj_1"
    assert res.project_progress == 50.0
    assert len(res.chains) == 1
    assert res.chains[0].id == "c1"
    assert res.chains[0].progress == 50.0
    assert len(res.chains[0].tasks) == 2


@pytest.mark.asyncio
async def test_task_query_use_case_filter() -> None:
    """测试 TaskQueryUseCase 的多条件内存过滤"""
    project_query_service = MagicMock()
    
    t1 = Task(id="t1", task_chain_id="c1", title="Read Chapter 1", status=TaskStatus.COMPLETED, description="a")
    t2 = Task(id="t2", task_chain_id="c1", title="Write Summary", status=TaskStatus.PENDING, description="b")
    t3 = Task(id="t3", task_chain_id="c2", title="Read Chapter 2", status=TaskStatus.PENDING, description="c")
    
    chain1 = TaskChain(id="c1", tasks=[t1, t2])
    chain2 = TaskChain(id="c2", tasks=[t3])
    
    project = Project(id="proj_1", task_chains=[chain1, chain2])
    project_query_service.get_project_detail = AsyncMock(return_value=project)
    
    uc = TaskQueryUseCase(project_query_service)
    
    # 1. 过滤状态
    res1 = await uc.list_tasks("proj_1", TaskQueryFilterDTO(status="PENDING"))
    assert len(res1) == 2
    assert {r.id for r in res1} == {"t2", "t3"}
    
    # 2. 过滤链 ID
    res2 = await uc.list_tasks("proj_1", TaskQueryFilterDTO(task_chain_id="c1"))
    assert len(res2) == 2
    assert {r.id for r in res2} == {"t1", "t2"}
    
    # 3. 关键字搜索
    res3 = await uc.list_tasks("proj_1", TaskQueryFilterDTO(search_keyword="summary"))
    assert len(res3) == 1
    assert res3[0].id == "t2"


@pytest.mark.asyncio
async def test_manage_task_tree_use_case_create_chain() -> None:
    """测试通过领域服务创建任务链"""
    project_repo = MagicMock()
    task_repo = MagicMock()
    event_publisher = AsyncMock()
    
    project = Project(id="proj_1", title="Proj 1")
    project_repo.get_by_id = AsyncMock(return_value=project)
    task_repo.save_task_chain = AsyncMock()
    
    task_op_service = TaskOperationDomainService(project_repo, task_repo, event_publisher)
    uc = ManageTaskTreeUseCase(task_op_service)
    
    dto = CreateTaskChainDTO(project_id="proj_1", title="New Chain", type="PLAN_STAGE", sequence_order=1)
    res = await uc.create_chain(dto)
    
    assert res.project_id == "proj_1"
    assert res.title == "New Chain"
    assert res.type == "PLAN_STAGE"
    task_repo.save_task_chain.assert_called_once()


@pytest.mark.asyncio
async def test_manage_task_tree_use_case_create_task_blocked() -> None:
    """测试通过领域服务新建任务且前置未就绪时自动 BLOCKED"""
    project_repo = MagicMock()
    task_repo = MagicMock()
    event_publisher = AsyncMock()
    
    t1 = Task(id="t1", title="Task 1", status=TaskStatus.PENDING)
    chain = TaskChain(id="c1", project_id="proj_1", tasks=[t1])
    project = Project(id="proj_1", title="Proj 1", task_chains=[chain])
    
    project_repo.get_by_id = AsyncMock(return_value=project)
    task_repo.find_task_chain_by_id = AsyncMock(return_value=chain)
    task_repo.get_task_chains_by_project_id = AsyncMock(return_value=[chain])
    task_repo.save_task = AsyncMock()
    
    task_op_service = TaskOperationDomainService(project_repo, task_repo, event_publisher)
    uc = ManageTaskTreeUseCase(task_op_service)
    
    dto = CreateTaskDTO(
        task_chain_id="c1",
        title="Task 2",
        depends_on_task_ids=["t1"]
    )
    
    res = await uc.create_task(dto)
    
    assert res.title == "Task 2"
    assert res.status == "BLOCKED"
    task_repo.save_task.assert_called_once()


@pytest.mark.asyncio
async def test_manage_task_tree_use_case_create_task_cyclic_blocked() -> None:
    """测试通过领域服务创建任务，存在环路时抛出 CyclicDependencyException 阻断"""
    project_repo = MagicMock()
    task_repo = MagicMock()
    event_publisher = AsyncMock()
    
    t1 = Task(id="t1", title="Task 1", depends_on_task_ids=[])
    chain = TaskChain(id="c1", project_id="proj_1", tasks=[t1])
    project = Project(id="proj_1", title="Proj 1", task_chains=[chain])
    
    project_repo.get_by_id = AsyncMock(return_value=project)
    task_repo.find_task_chain_by_id = AsyncMock(return_value=chain)
    task_repo.get_task_chains_by_project_id = AsyncMock(return_value=[chain])
    
    task_op_service = TaskOperationDomainService(project_repo, task_repo, event_publisher)
    uc = ManageTaskTreeUseCase(task_op_service)
    
    dto = CreateTaskDTO(
        task_chain_id="c1",
        title="Task 2",
        depends_on_task_ids=["t1"]
    )
    
    # 模拟环路
    import app.domain.project.services.task_operation_service as service_module
    orig_uuid = service_module.uuid.uuid4
    mock_uuid = MagicMock()
    mock_uuid.hex = "fixed_task_id"
    service_module.uuid.uuid4 = MagicMock(return_value=mock_uuid)
    
    try:
        t1.depends_on_task_ids = ["task_fixed_ta"]  # 相互依赖
        with pytest.raises(CyclicDependencyException):
            await uc.create_task(dto)
    finally:
        service_module.uuid.uuid4 = orig_uuid


@pytest.mark.asyncio
async def test_change_task_status_completed_unlocks_downstream() -> None:
    """测试通过领域服务将任务改为 COMPLETED 级联解锁下游节点并发布就绪事件"""
    project_repo = MagicMock()
    task_repo = MagicMock()
    event_publisher = AsyncMock()
    
    project = Project(id="proj_1", status=ProjectStatus.ACTIVE)
    project_repo.get_by_id = AsyncMock(return_value=project)
    
    t1 = Task(id="t1", task_chain_id="c1", status=TaskStatus.PENDING)
    t2 = Task(id="t2", task_chain_id="c1", status=TaskStatus.BLOCKED, depends_on_task_ids=["t1"])
    chain = TaskChain(id="c1", project_id="proj_1", tasks=[t1, t2])
    
    task_repo.find_task_by_id = AsyncMock(return_value=t1)
    task_repo.find_task_chain_by_id = AsyncMock(return_value=chain)
    task_repo.get_task_chains_by_project_id = AsyncMock(return_value=[chain])
    task_repo.save_task_chains = AsyncMock()
    
    status_progress_service = TaskStateDomainService(project_repo, task_repo, event_publisher)
    uc = ChangeTaskStatusUseCase(status_progress_service)
    
    dto = UpdateTaskStatusDTO(status="COMPLETED")
    res = await uc.execute("t1", dto)
    
    assert res.status == "COMPLETED"
    assert "t2" in res.unlocked_task_ids
    assert t2.status == TaskStatus.PENDING
    assert res.chain_progress == 50.0
    event_publisher.publish.assert_called()


@pytest.mark.asyncio
async def test_change_task_status_retract_locks_downstream() -> None:
    """测试通过领域服务撤回任务状态时级联反向锁定下游节点为 BLOCKED"""
    project_repo = MagicMock()
    task_repo = MagicMock()
    event_publisher = AsyncMock()
    
    project = Project(id="proj_1", status=ProjectStatus.ACTIVE)
    project_repo.get_by_id = AsyncMock(return_value=project)
    
    t1 = Task(id="t1", task_chain_id="c1", status=TaskStatus.COMPLETED)
    t2 = Task(id="t2", task_chain_id="c1", status=TaskStatus.PENDING, depends_on_task_ids=["t1"])
    chain = TaskChain(id="c1", project_id="proj_1", tasks=[t1, t2])
    
    task_repo.find_task_by_id = AsyncMock(return_value=t1)
    task_repo.find_task_chain_by_id = AsyncMock(return_value=chain)
    task_repo.get_task_chains_by_project_id = AsyncMock(return_value=[chain])
    task_repo.save_task_chains = AsyncMock()
    
    status_progress_service = TaskStateDomainService(project_repo, task_repo, event_publisher)
    uc = ChangeTaskStatusUseCase(status_progress_service)
    
    dto = UpdateTaskStatusDTO(status="PENDING")
    res = await uc.execute("t1", dto)
    
    assert res.status == "PENDING"
    assert t2.status == TaskStatus.BLOCKED
    assert res.chain_progress == 0.0


@pytest.mark.asyncio
async def test_task_note_attachment_attachment_and_direct_creation() -> None:
    """测试通过领域服务执行素材笔记关联与直接撰写、解绑、角标计数更新"""
    task_repo = MagicMock()
    note_attachment_repo = MagicMock()
    note_repo = MagicMock()
    
    t1 = Task(id="t1", task_chain_id="c1", attached_note_count=0)
    chain = TaskChain(id="c1", project_id="proj_1", tasks=[t1])
    
    task_repo.find_task_by_id = AsyncMock(return_value=t1)
    task_repo.find_task_chain_by_id = AsyncMock(return_value=chain)
    task_repo.save_task = AsyncMock()
    
    note_attachment_service = TaskNoteAttachmentDomainService(task_repo, note_attachment_repo, note_repo)
    uc = TaskNoteAttachmentUseCase(note_attachment_service)
    
    # 场景 B: 绑定已有
    existing_note = MagicMock()
    existing_note.id = "note_1"
    note_repo.find_by_id = AsyncMock(return_value=existing_note)
    note_attachment_repo.get_attached_note_ids_by_task = AsyncMock(return_value=[])
    note_attachment_repo.create_attachment_relation = AsyncMock(return_value="rel_1")
    
    dto_b = CreateOrAttachTaskNoteDTO(material_note_id="note_1")
    res_b = await uc.attach_or_create("t1", dto_b)
    
    assert res_b.material_note_id == "note_1"
    assert res_b.attached_note_count == 1
    assert t1.attached_note_count == 1
    
    # 场景 A: 新撰写
    note_repo.save_material_note = AsyncMock()
    note_attachment_repo.get_attached_note_ids_by_task = AsyncMock(return_value=["note_1"])
    
    dto_a = CreateOrAttachTaskNoteDTO(
        paraphrase="my new thought",
        original_snippet="original quote",
        scenario_context="reading chapter 1"
    )
    res_a = await uc.attach_or_create("t1", dto_a)
    
    assert res_a.attached_note_count == 2
    assert t1.attached_note_count == 2
    note_repo.save_material_note.assert_called_once()
    
    # 解挂
    note_attachment_repo.remove_attachment_relation = AsyncMock(return_value=True)
    await uc.detach("t1", "note_1")
    assert t1.attached_note_count == 1
