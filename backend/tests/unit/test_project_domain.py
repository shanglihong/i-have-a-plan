"""
领域层单元测试 - 项目上下文

测试纯领域逻辑，不依赖任何外部基础设施（数据库、LLM、HTTP）。
验证拓扑排序与 Deadline 顺延传播算法的正确性。
"""
from __future__ import annotations

import pytest
from datetime import datetime, timedelta

from app.domain.project.domain_service import (
    TopologyCycleError,
    propagate_deadline_delay,
    topological_sort,
)
from app.domain.project.entities import Project, ProjectStatus, ProjectType, Task, TaskDomain


def _make_task_domain(task_id: str) -> TaskDomain:
    """辅助函数：快速创建测试用 TaskDomain"""
    task = Task(
        id=task_id,
        project_id="proj-1",
        title=f"Task {task_id}",
    )
    return TaskDomain(do=task)


class TestTopologicalSort:
    """拓扑排序测试套件"""

    def test_linear_dependency_chain(self) -> None:
        """A -> B -> C 线性链路应按顺序排列"""
        task_a = _make_task_domain("A")
        task_b = _make_task_domain("B")
        task_c = _make_task_domain("C")

        # B 依赖 A，C 依赖 B
        task_b.depends_on_tasks = [task_a]
        task_c.depends_on_tasks = [task_b]

        result = topological_sort([task_c, task_b, task_a])  # 乱序输入
        ids = [t.id for t in result]

        assert ids.index("A") < ids.index("B")
        assert ids.index("B") < ids.index("C")

    def test_no_dependencies(self) -> None:
        """无依赖任务可以任意顺序排列"""
        task_a = _make_task_domain("A")
        task_b = _make_task_domain("B")

        result = topological_sort([task_a, task_b])
        assert len(result) == 2

    def test_cycle_detection_raises(self) -> None:
        """A -> B -> A 环路应抛出 TopologyCycleError"""
        task_a = _make_task_domain("A")
        task_b = _make_task_domain("B")

        task_a.depends_on_tasks = [task_b]
        task_b.depends_on_tasks = [task_a]

        with pytest.raises(TopologyCycleError) as exc_info:
            topological_sort([task_a, task_b])

        assert len(exc_info.value.cycle_path) > 0

    def test_diamond_dependency(self) -> None:
        """菱形依赖 A -> B, A -> C, B -> D, C -> D 应正常处理"""
        task_a = _make_task_domain("A")
        task_b = _make_task_domain("B")
        task_c = _make_task_domain("C")
        task_d = _make_task_domain("D")

        task_b.depends_on_tasks = [task_a]
        task_c.depends_on_tasks = [task_a]
        task_d.depends_on_tasks = [task_b, task_c]

        result = topological_sort([task_a, task_b, task_c, task_d])
        ids = [t.id for t in result]

        assert ids.index("A") < ids.index("B")
        assert ids.index("A") < ids.index("C")
        assert ids.index("B") < ids.index("D")
        assert ids.index("C") < ids.index("D")


class TestDeadlinePropagation:
    """Deadline 顺延传播测试套件"""

    def test_downstream_deadline_propagated(self) -> None:
        """延迟 A，B（A 的后继）的 Deadline 应顺延"""
        base = datetime(2025, 1, 10)
        task_a = _make_task_domain("A")
        task_b = _make_task_domain("B")
        task_b.do.deadline = base
        task_b.depends_on_tasks = [task_a]

        affected = propagate_deadline_delay(
            tasks=[task_a, task_b],
            delayed_task_id="A",
            delay_days=3,
        )

        assert len(affected) == 1
        assert affected[0].id == "B"
        assert affected[0].do.deadline == base + timedelta(days=3)

    def test_no_downstream_no_effect(self) -> None:
        """无后继任务时，顺延不应影响任何任务"""
        task_a = _make_task_domain("A")

        affected = propagate_deadline_delay(
            tasks=[task_a],
            delayed_task_id="A",
            delay_days=5,
        )

        assert len(affected) == 0
