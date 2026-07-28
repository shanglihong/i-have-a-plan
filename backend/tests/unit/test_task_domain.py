"""Task 领域模型与服务单元测试"""

import pytest
from app.domain.project.entities import Task, TaskChain, TaskStatus
from app.domain.project.exceptions import (
    CyclicDependencyException,
    TaskBlockedException,
    InvalidTaskStateTransitionException,
)
from app.domain.project.services.task_dag_service import TaskDAGDomainService
from app.domain.project.services.task_progress_service import TaskProgressDomainService


def test_task_status_transition_success() -> None:
    """测试 Task 正常状态转移逻辑"""
    task = Task(id="task_1", title="任务 1", status=TaskStatus.PENDING)

    # PENDING -> RUNNING
    task.transit_status(TaskStatus.RUNNING)
    assert task.status == TaskStatus.RUNNING

    # RUNNING -> COMPLETED
    task.transit_status(TaskStatus.COMPLETED)
    assert task.status == TaskStatus.COMPLETED

    # COMPLETED -> PENDING (撤回)
    task.transit_status(TaskStatus.PENDING)
    assert task.status == TaskStatus.PENDING

    # PENDING -> COMPLETED (直接完成)
    task.transit_status(TaskStatus.COMPLETED)
    assert task.status == TaskStatus.COMPLETED


def test_task_status_transition_blocked() -> None:
    """测试 Task 锁定状态转移限制"""
    task = Task(id="task_1", title="任务 1", status=TaskStatus.BLOCKED)

    # BLOCKED 状态不允许手动转为 RUNNING 或 COMPLETED，抛出 TaskBlockedException
    with pytest.raises(TaskBlockedException):
        task.transit_status(TaskStatus.RUNNING)

    with pytest.raises(TaskBlockedException):
        task.transit_status(TaskStatus.COMPLETED)

    # BLOCKED 可以转为 PENDING (解锁)
    task.transit_status(TaskStatus.PENDING)
    assert task.status == TaskStatus.PENDING


def test_task_status_transition_invalid() -> None:
    """测试 Task 非法的状态转移"""
    task = Task(id="task_1", title="任务 1", status=TaskStatus.COMPLETED)

    # COMPLETED 不能直接转为 RUNNING
    with pytest.raises(InvalidTaskStateTransitionException):
        task.transit_status(TaskStatus.RUNNING)

    # COMPLETED 不能直接转为 BLOCKED
    with pytest.raises(InvalidTaskStateTransitionException):
        task.transit_status(TaskStatus.BLOCKED)


def test_task_note_count() -> None:
    """测试 Task 笔记计数增减"""
    task = Task(id="task_1", title="任务 1", attached_note_count=0)

    task.increment_attached_note_count()
    assert task.attached_note_count == 1

    task.decrement_attached_note_count()
    assert task.attached_note_count == 0

    # 边界情况：笔记计数不能为负数
    task.decrement_attached_note_count()
    assert task.attached_note_count == 0


def test_dag_engine_sort_and_cycle_detect() -> None:
    """测试 DAG 服务的拓扑排序和环路检测"""
    # 1. 正常无环依赖测试: task_1 -> task_2 -> task_3
    t1 = Task(id="t1", title="Task 1", depends_on_task_ids=[])
    t2 = Task(id="t2", title="Task 2", depends_on_task_ids=["t1"])
    t3 = Task(id="t3", title="Task 3", depends_on_task_ids=["t2"])

    topo_order = TaskDAGDomainService.validate_acyclic_and_sort([t1, t2, t3])
    assert topo_order == ["t1", "t2", "t3"]

    # 2. 有环依赖测试: t1 -> t2 -> t3 -> t1
    t1.depends_on_task_ids = ["t3"]
    with pytest.raises(CyclicDependencyException):
        TaskDAGDomainService.validate_acyclic_and_sort([t1, t2, t3])


def test_dag_engine_downstream_unlock() -> None:
    """测试 DAG 服务下游级联解锁"""
    # 依赖结构: t1 -> t2, t3 -> t2 (t2 依赖 t1 和 t3)
    t1 = Task(id="t1", status=TaskStatus.COMPLETED)
    t2 = Task(id="t2", status=TaskStatus.BLOCKED, depends_on_task_ids=["t1", "t3"])
    t3 = Task(id="t3", status=TaskStatus.PENDING)

    all_tasks = [t1, t2, t3]

    # 当 t1 完成时，尝试解锁下游，但由于 t3 依然是 PENDING (未 COMPLETED)，所以 t2 仍处于 BLOCKED
    unlocked = TaskDAGDomainService.evaluate_downstream_unlock("t1", all_tasks)
    assert len(unlocked) == 0
    assert t2.status == TaskStatus.BLOCKED

    # 当 t3 也变为 COMPLETED 时，再次解算解锁下游，t2 所有的前置依赖全部完成，自动解锁为 PENDING
    t3.status = TaskStatus.COMPLETED
    unlocked = TaskDAGDomainService.evaluate_downstream_unlock("t3", all_tasks)
    assert len(unlocked) == 1
    assert unlocked[0].id == "t2"
    assert t2.status == TaskStatus.PENDING


def test_dag_engine_downstream_lock() -> None:
    """测试 DAG 服务上游重置时下游级联锁定"""
    # 依赖结构: t1 -> t2 -> t3 (都已解锁，分别为 COMPLETED, RUNNING, PENDING)
    t1 = Task(id="t1", status=TaskStatus.COMPLETED)
    t2 = Task(id="t2", status=TaskStatus.RUNNING, depends_on_task_ids=["t1"])
    t3 = Task(id="t3", status=TaskStatus.PENDING, depends_on_task_ids=["t2"])

    all_tasks = [t1, t2, t3]

    # 如果 t1 被重置为 PENDING，下游的 t2 和 t3 均由于前置失效，需被级联锁定为 BLOCKED
    locked_tasks = TaskDAGDomainService.evaluate_downstream_lock("t1", all_tasks)
    assert len(locked_tasks) == 2
    assert t2.status == TaskStatus.BLOCKED
    assert t3.status == TaskStatus.BLOCKED


def test_progress_calculator() -> None:
    """测试进度推导与计算器"""
    # 1. 任务链计算
    t1 = Task(id="t1", status=TaskStatus.COMPLETED)
    t2 = Task(id="t2", status=TaskStatus.RUNNING)
    t3 = Task(id="t3", status=TaskStatus.BLOCKED)

    # 1.1 部分开始 (RUNNING)
    progress, status = TaskProgressDomainService.calculate_chain_progress_and_status([t1, t2, t3])
    assert progress == round(1/3 * 100.0, 2)
    assert status == TaskStatus.RUNNING

    # 1.2 全部未开始 (PENDING)
    t1.status = TaskStatus.PENDING
    t2.status = TaskStatus.BLOCKED
    progress, status = TaskProgressDomainService.calculate_chain_progress_and_status([t1, t2, t3])
    assert progress == 0.0
    assert status == TaskStatus.PENDING

    # 1.3 全部完成 (COMPLETED)
    t1.status = TaskStatus.COMPLETED
    t2.status = TaskStatus.COMPLETED
    t3.status = TaskStatus.COMPLETED
    progress, status = TaskProgressDomainService.calculate_chain_progress_and_status([t1, t2, t3])
    assert progress == 100.0
    assert status == TaskStatus.COMPLETED

    # 2. 项目整体进度计算
    c1 = TaskChain(id="c1", tasks=[t1, t2])  # 2个已完成
    c2 = TaskChain(id="c2", tasks=[t3])      # 1个已完成，共3个已完成
    total_progress = TaskProgressDomainService.calculate_project_progress([c1, c2])
    assert total_progress == 100.0

    t3.status = TaskStatus.PENDING  # 2个已完成 / 3个总任务
    total_progress = TaskProgressDomainService.calculate_project_progress([c1, c2])
    assert total_progress == round(2/3 * 100.0, 2)
