"""TaskRepository 独立存储与隔离测试"""

import pytest
from app.domain.project.entities import TaskChain, Task, TaskChainType, TaskStatus
from app.infrastructure.db.session import init_db, get_async_session
from app.infrastructure.db.repositories.project_repository import ProjectRepository
from app.infrastructure.db.repositories.task_repository import TaskRepository


@pytest.mark.asyncio
async def test_task_repository_separation() -> None:
    await init_db()
    async for session in get_async_session():
        project_repo = ProjectRepository(session)
        task_repo = TaskRepository(session)

        # 1. 保存 TaskChain 与 Tasks 到 TaskRepository
        t1 = Task(id="t_001", title="步骤1", status=TaskStatus.PENDING)
        t2 = Task(id="t_002", title="步骤2", status=TaskStatus.PENDING, depends_on_task_ids=["t_001"])
        chain = TaskChain(id="c_001", title="阶段1", chain_type=TaskChainType.PLAN_STAGE, tasks=[t1, t2])

        await task_repo.save_task_chains(project_id="proj_test_sep", task_chains=[chain])

        # 2. 从 TaskRepository 独立拉取
        chains = await task_repo.get_task_chains_by_project_id("proj_test_sep")
        assert len(chains) == 1
        assert chains[0].id == "c_001"
        assert len(chains[0].tasks) == 2
        assert chains[0].tasks[1].depends_on_task_ids == ["t_001"]

        # 3. 独立更新单个 Task 状态
        updated_task = await task_repo.update_task_status("t_001", TaskStatus.COMPLETED)
        assert updated_task is not None
        assert updated_task.status == TaskStatus.COMPLETED

        # 4. 再次获取验证状态独立持久化
        task_single = await task_repo.get_task_by_id("t_001")
        assert task_single is not None
        assert task_single.status == TaskStatus.COMPLETED

        # 5. 删除关联 Task
        deleted = await task_repo.delete_by_project_id("proj_test_sep")
        assert deleted is True
        empty_chains = await task_repo.get_task_chains_by_project_id("proj_test_sep")
        assert len(empty_chains) == 0
        break
