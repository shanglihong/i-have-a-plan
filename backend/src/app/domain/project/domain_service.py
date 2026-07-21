"""
项目与任务上下文 - 领域服务 (Domain Services)

领域服务承载无法归属单一实体的纯业务逻辑。
此处实现两个核心算法：
  1. 拓扑排序 (Topological Sort)：用于计算任务树的合法执行顺序，支撑重调度计算流。
  2. Deadline 顺延传播：给定一个延迟天数，计算所有受影响任务的新 Deadline。

严格约束：此文件内禁止任何 import 外部框架（SQLModel / FastAPI / LangChain 等）。
"""
from __future__ import annotations

from collections import deque
from datetime import timedelta
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.domain.project.entities import TaskDomain


class TopologyCycleError(Exception):
    """任务依赖图存在环路 (Dead Lock)"""

    def __init__(self, cycle_path: list[str]) -> None:
        self.cycle_path = cycle_path
        super().__init__(f"检测到任务依赖环路: {' -> '.join(cycle_path)}")


def topological_sort(tasks: list["TaskDomain"]) -> list["TaskDomain"]:
    """
    对任务列表进行拓扑排序（Kahn 算法 - BFS 实现）。

    Args:
        tasks: 内存中已装载 depends_on_tasks 的充血模型任务列表

    Returns:
        拓扑有序的任务列表（从无依赖到有依赖）

    Raises:
        TopologyCycleError: 当检测到循环依赖时抛出，附带环路路径
    """
    in_degree: dict[str, int] = {t.id: 0 for t in tasks}
    adjacency: dict[str, list[str]] = {t.id: [] for t in tasks}

    for task in tasks:
        for dep in task.depends_on_tasks:
            if dep.id in adjacency:
                adjacency[dep.id].append(task.id)
                in_degree[task.id] += 1

    queue: deque[str] = deque(
        task_id for task_id, degree in in_degree.items() if degree == 0
    )
    sorted_ids: list[str] = []

    while queue:
        current_id = queue.popleft()
        sorted_ids.append(current_id)
        for neighbor_id in adjacency[current_id]:
            in_degree[neighbor_id] -= 1
            if in_degree[neighbor_id] == 0:
                queue.append(neighbor_id)

    if len(sorted_ids) != len(tasks):
        # 存在未被处理的节点，说明有环路
        remaining = [t.id for t in tasks if t.id not in sorted_ids]
        raise TopologyCycleError(remaining)

    task_map = {t.id: t for t in tasks}
    return [task_map[task_id] for task_id in sorted_ids]


def propagate_deadline_delay(
    tasks: list["TaskDomain"],
    delayed_task_id: str,
    delay_days: int,
) -> list["TaskDomain"]:
    """
    半自动重调度：给定一个任务发生延迟，向后传播影响所有下游任务的 Deadline。

    算法逻辑：
      1. 通过拓扑排序确定执行顺序
      2. 从延迟节点出发，BFS 遍历所有直接/间接后继任务
      3. 对每个受影响任务的 deadline 增加 delay_days

    Args:
        tasks: 充血模型任务列表（已装载 depends_on_tasks）
        delayed_task_id: 发生延迟的任务 ID
        delay_days: 延迟天数（正整数）

    Returns:
        已修改 deadline 的任务列表（仅包含受影响任务，由仓储层事务落盘）
    """
    # 构建后继邻接表（从依赖方向反转）
    successors: dict[str, list["TaskDomain"]] = {t.id: [] for t in tasks}
    for task in tasks:
        for dep in task.depends_on_tasks:
            if dep.id in successors:
                successors[dep.id].append(task)

    affected: list["TaskDomain"] = []
    visited: set[str] = set()
    queue: deque[str] = deque([delayed_task_id])

    while queue:
        current_id = queue.popleft()
        if current_id in visited:
            continue
        visited.add(current_id)
        for successor in successors.get(current_id, []):
            if successor.do.deadline is not None:
                successor.do.deadline = successor.do.deadline + timedelta(days=delay_days)
            affected.append(successor)
            queue.append(successor.id)

    return affected
