"""项目与任务领域实体模块

包含 Project 聚合根, TaskChain 中观容器, Task 微观执行单元等领域模型。
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Tuple
from app.domain.base import BaseEntity
from app.utils.snow import id_worker


class ProjectType(str, Enum):
    """项目类型定义"""
    READING = "READING"
    PLAN = "PLAN"


class ProjectStatus(str, Enum):
    """项目生命周期三态模型"""
    INIT = "INIT"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class ProjectSortBy(str, Enum):
    """项目列表排序字段定义"""
    UPDATED_AT = "updated_at"
    CREATED_AT = "created_at"
    NAME = "name"



class TaskChainType(str, Enum):
    """任务链类型定义"""
    READING_CHAPTER = "READING_CHAPTER"
    PLAN_STAGE = "PLAN_STAGE"
    RETROSPECTIVE = "RETROSPECTIVE"
    DEFAULT = "DEFAULT"


class TaskStatus(str, Enum):
    """任务微观执行状态"""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"


from app.domain.project.exceptions import (
    TaskBlockedException,
    InvalidTaskStateTransitionException,
)

@dataclass
class Task(BaseEntity):
    """Task 微观执行单元"""
    id: str = field(default_factory=lambda: f"task_{id_worker.next_id_str()}")
    title: str = ""
    description: str = ""
    status: TaskStatus = TaskStatus.PENDING
    sequence_order: int = 1
    task_chain_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    depends_on_task_ids: List[str] = field(default_factory=list)  # 依赖项的任务 ID 列表 (DAG)
    attached_note_ids: List[str] = field(default_factory=list)  # 关联的素材笔记ID列表

    def mark_completed(self) -> None:
        self.status = TaskStatus.COMPLETED
        self.updated_at = datetime.now(timezone.utc)

    def transit_status(self, target_status: TaskStatus) -> None:
        """执行状态转移校验并修改状态"""
        if self.status == target_status:
            return

        allowed = False
        if self.status == TaskStatus.PENDING:
            if target_status in (TaskStatus.RUNNING, TaskStatus.COMPLETED, TaskStatus.BLOCKED):
                allowed = True
        elif self.status == TaskStatus.RUNNING:
            if target_status in (TaskStatus.PENDING, TaskStatus.COMPLETED):
                allowed = True
        elif self.status == TaskStatus.COMPLETED:
            if target_status == TaskStatus.PENDING:
                allowed = True
        elif self.status == TaskStatus.BLOCKED:
            if target_status == TaskStatus.PENDING:
                allowed = True
            elif target_status in (TaskStatus.RUNNING, TaskStatus.COMPLETED):
                raise TaskBlockedException(f"无法操作锁定任务: [{self.title}]。有前置任务未完成。")

        if not allowed:
            raise InvalidTaskStateTransitionException(self.status, target_status)

        self.status = target_status
        self.updated_at = datetime.now(timezone.utc)

    def unlock(self) -> None:
        """将状态从 BLOCKED 解锁为 PENDING"""
        if self.status == TaskStatus.BLOCKED:
            self.status = TaskStatus.PENDING
            self.updated_at = datetime.now(timezone.utc)

    def lock(self) -> None:
        """将非 COMPLETED 的状态锁定为 BLOCKED"""
        if self.status != TaskStatus.COMPLETED and self.status != TaskStatus.BLOCKED:
            self.status = TaskStatus.BLOCKED
            self.updated_at = datetime.now(timezone.utc)


@dataclass
class TaskChain(BaseEntity):
    """TaskChain 中观容器"""
    id: str = field(default_factory=lambda: f"chain_{id_worker.next_id_str()}")
    title: str = ""
    chain_type: TaskChainType = TaskChainType.DEFAULT
    sequence_order: int = 1
    status: TaskStatus = TaskStatus.PENDING
    project_id: Optional[str] = None
    book_id: Optional[str] = None
    chapter_id: Optional[str] = None
    tasks: List[Task] = field(default_factory=list)
    progress: float = 0.0

    @property
    def is_completed(self) -> bool:
        if not self.tasks:
            return self.status == TaskStatus.COMPLETED
        return all(t.status == TaskStatus.COMPLETED for t in self.tasks)

    def recalculate_progress_and_status(self) -> None:
        """
        基于当前 TaskChain 下属 the Task 状态重算并更新自身的进度百分比和最新状态。
        """
        if not self.tasks:
            self.progress = 0.0
            self.status = TaskStatus.PENDING
            return

        completed_count = sum(1 for t in self.tasks if t.status == TaskStatus.COMPLETED)
        self.progress = round((completed_count / len(self.tasks)) * 100.0, 2)

        # 状态推导逻辑
        if completed_count == len(self.tasks):
            self.status = TaskStatus.COMPLETED
            return

        # 检查是否有任务已经开始 (RUNNING 或 IN_PROGRESS) 或者已经完成了一部分
        has_started = any(t.status in (TaskStatus.RUNNING, TaskStatus.IN_PROGRESS) for t in self.tasks)
        has_completed_some = completed_count > 0

        if has_started or has_completed_some:
            self.status = TaskStatus.RUNNING
        else:
            self.status = TaskStatus.PENDING


@dataclass
class Project(BaseEntity):
    """Project 聚合根 (充血模型)"""
    id: str = field(default_factory=lambda: f"project_{id_worker.next_id_str()}")
    title: str = ""
    description: str = ""
    project_type: ProjectType = ProjectType.READING
    status: ProjectStatus = ProjectStatus.INIT
    assigned_agent_id: Optional[str] = None
    deadline: Optional[datetime] = None
    book_id: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    task_chains: List[TaskChain] = field(default_factory=list)

    _task_chains_map: Dict[str, TaskChain] = field(default_factory=dict, init=False, repr=False)
    _tasks_map: Dict[str, Task] = field(default_factory=dict, init=False, repr=False)

    def __post_init__(self) -> None:
        self._rebuild_maps()

    def __setattr__(self, name, value):
        super().__setattr__(name, value)
        if name == "task_chains":
            self._rebuild_maps()

    def _rebuild_maps(self) -> None:
        self._task_chains_map = {c.id: c for c in self.task_chains}
        self._tasks_map = {}
        for chain in self.task_chains:
            for task in chain.tasks:
                self._tasks_map[task.id] = task

    @property
    def progress(self) -> int:
        """根据关联任务算项目整体完成进度 (%)"""
        if not self._tasks_map:
            return 100 if self.status == ProjectStatus.ARCHIVED else 0
        completed = sum(1 for t in self._tasks_map.values() if t.status == TaskStatus.COMPLETED)
        return int((completed / len(self._tasks_map)) * 100)

    @property
    def all_tasks(self) -> List[Task]:
        """获取项目下所有任务链中的全量原子任务列表"""
        return list(self._tasks_map.values())

    def get_project_progress(self) -> float:
        """计算项目整体加权完成进度百分比 (保留两位小数)"""
        tasks = self.all_tasks
        if not tasks:
            return 0.0
        completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
        return round((completed / len(tasks)) * 100.0, 2)

    def get_task_chain(self, chain_id: str) -> Optional[TaskChain]:
        """根据 ID 检索项目内的任务链"""
        return self._task_chains_map.get(chain_id)

    def get_task(self, task_id: str) -> Optional[Task]:
        """根据 ID 检索项目内的原子任务"""
        return self._tasks_map.get(task_id)

    def add_task(self, task: Task) -> None:
        """在项目指定任务链下添加一个新的原子任务，自动计算初始状态并挂载"""
        # 1. 查找任务链
        if not task.task_chain_id:
            raise ValueError(f"未找到归属的任务链: task_id:{task.id}")
        chain = self.get_task_chain(task.task_chain_id)
        if not chain:
            raise ValueError(f"未找到归属的任务链: chain_id:{task.task_chain_id}")

        # 2. 检查依赖项状态
        initial_status = TaskStatus.PENDING
        if task.depends_on_task_ids:
            for dep_id in task.depends_on_task_ids:
                dep_task = self.get_task(dep_id)
                if not dep_task:
                    raise ValueError(f"未找到前置依赖任务: {dep_id}")
                if dep_task.status != TaskStatus.COMPLETED:
                    initial_status = TaskStatus.BLOCKED
        task.status = initial_status

        # 3. 挂载到任务链
        chain.tasks.append(task)

        # 4. 刷新本地映射
        self._rebuild_maps()

        self.updated_at = datetime.now(timezone.utc)

    def validate_acyclic(self) -> bool:
        """Kahn 拓扑排序校验环路"""
        tasks = self.all_tasks
        in_degree = {t.id: 0 for t in tasks}
        adj = {t.id: [] for t in tasks}

        for t in tasks:
            for dep in t.depends_on_task_ids:
                if dep in adj:
                    adj[dep].append(t.id)
                    in_degree[t.id] += 1

        queue = [t_id for t_id, deg in in_degree.items() if deg == 0]
        visited_count = 0

        while queue:
            curr = queue.pop(0)
            visited_count += 1
            for nxt in adj[curr]:
                in_degree[nxt] -= 1
                if in_degree[nxt] == 0:
                    queue.append(nxt)

        return visited_count == len(tasks)

    def transit_task_status(self, task_id: str, target_status: TaskStatus) -> Tuple[bool, List[Task], List[Task]]:
        """
        聚合根核心行为：扭转指定任务的状态，并自动在内部触发 DAG 级联解锁或撤回反向锁定。
        返回 (是否更新成功, 级联解锁任务列表, 级联锁定任务列表)
        """
        task = self.get_task(task_id)
        if not task:
            return False, [], []

        old_status = task.status
        if old_status == target_status:
            return False, [], []

        # 1. 改变当前任务状态
        task.transit_status(target_status)

        unlocked_tasks: List[Task] = []
        locked_tasks: List[Task] = []

        # 2. 级联解锁或锁定计算
        if target_status == TaskStatus.COMPLETED:
            unlocked_tasks = self._evaluate_downstream_unlock(task_id)
        elif old_status == TaskStatus.COMPLETED and target_status != TaskStatus.COMPLETED:
            locked_tasks = self._evaluate_downstream_lock(task_id)

        # 3. 重新推导所有任务链的进度与最新状态
        for chain in self.task_chains:
            chain.recalculate_progress_and_status()

        self.updated_at = datetime.now(timezone.utc)
        return True, unlocked_tasks, locked_tasks

    def _evaluate_downstream_unlock(self, completed_task_id: str) -> List[Task]:
        """
        级联解锁下游：找到所有依赖 completed_task_id 的下游任务，
        如果其所有前置依赖都已完成，则将其从 BLOCKED 状态解锁为 PENDING
        """
        tasks = self.all_tasks
        
        unlocked = []
        for t in tasks:
            if t.status == TaskStatus.BLOCKED and completed_task_id in t.depends_on_task_ids:
                all_deps_done = True
                for dep_id in t.depends_on_task_ids:
                    dep_task = self._tasks_map.get(dep_id)
                    if dep_task and dep_task.status != TaskStatus.COMPLETED:
                        all_deps_done = False
                        break
                
                if all_deps_done:
                    t.unlock()
                    unlocked.append(t)
                    # 递归寻找更下游的可解锁任务
                    unlocked.extend(self._evaluate_downstream_unlock(t.id))
        return unlocked

    def _evaluate_downstream_lock(self, reset_task_id: str) -> List[Task]:
        """
        级联锁定下游：当 reset_task_id 从 COMPLETED 被撤回时，
        将其所有的下游子孙节点强制重置并锁定为 BLOCKED 状态
        """
        tasks = self.all_tasks
        locked = []
        for t in tasks:
            if reset_task_id in t.depends_on_task_ids:
                if t.status != TaskStatus.BLOCKED:
                    t.lock()
                    locked.append(t)
                    # 级联锁定下游
                    locked.extend(self._evaluate_downstream_lock(t.id))
        return locked

    def bind_agent(self, agent_id: str) -> None:
        """绑定 Agent 句柄 ID"""
        self.assigned_agent_id = agent_id
        self.updated_at = datetime.now(timezone.utc)

    def attach_task_tree(self, task_chains: List[TaskChain]) -> None:
        """挂载生成的任务树」"""
        self.task_chains = task_chains
        self._rebuild_maps()
        self.updated_at = datetime.now(timezone.utc)

    def attach_toc_tree(self, toc_tree: List[dict]) -> None:
        """根据 Book 目录大纲树实例化 READING_CHAPTER 任务链树"""
        chains: List[TaskChain] = []

        for idx, node in enumerate(toc_tree, start=1):
            chain_id = f"chain_{node.get('id', idx)}"
            chapter_id = node.get("target_chapter_id", f"chap_{idx:02d}")
            title = node.get("title", f"第 {idx} 章")

            # 生成章节精读任务
            read_task = Task(
                id=f"task_{chapter_id}_read",
                title=f"精读 {title}",
                description="完成对应章节正文切片阅读",
                sequence_order=1,
                status=TaskStatus.PENDING,
            )

            chain = TaskChain(
                id=chain_id,
                project_id=self.id,
                title=title,
                chain_type=TaskChainType.READING_CHAPTER,
                sequence_order=idx,
                status=TaskStatus.PENDING,
                book_id=self.book_id,
                chapter_id=chapter_id,
                tasks=[read_task],
            )
            chains.append(chain)

        self.task_chains = chains
        self._rebuild_maps()
        self.updated_at = datetime.now(timezone.utc)

    def transit_to_active(self) -> None:
        """从 INIT 状态转换为 ACTIVE"""
        if self.status != ProjectStatus.INIT:
            raise ValueError(f"无法将状态为 {self.status} 的项目转为 ACTIVE")
        self.status = ProjectStatus.ACTIVE
        self.updated_at = datetime.now(timezone.utc)

    def archive(self) -> None:
        """从 ACTIVE 状态转为 ARCHIVED 归档"""
        if self.status != ProjectStatus.ACTIVE:
            raise ValueError(f"只有 ACTIVE 状态的项目才能归档，当前状态为: {self.status}")
        self.status = ProjectStatus.ARCHIVED
        self.updated_at = datetime.now(timezone.utc)

    def reactivate(self) -> None:
        """从 ARCHIVED 转为 ACTIVE 重激活"""
        if self.status != ProjectStatus.ARCHIVED:
            raise ValueError(f"只有 ARCHIVED 状态的项目才能重新激活，当前状态为: {self.status}")
        self.status = ProjectStatus.ACTIVE
        self.updated_at = datetime.now(timezone.utc)
    
    def is_archived(self) -> bool:
        return self.status == ProjectStatus.ARCHIVED

    def is_active(self) -> bool:
        return self.status == ProjectStatus.ACTIVE

    def add_retrospective_milestone(
        self,
        title: str = "项目复盘",
        description: str = "录入经验笔记与总结",
    ) -> TaskChain:
        """追加生成复盘里程碑 (RETROSPECTIVE TaskChain)"""
        chain_id = f"chain_retro_{self.id}"
        task_id = f"task_retro_{self.id}"
        sequence_order = len(self.task_chains) + 1

        retro_task = Task(
            id=task_id,
            title=title,
            description=description,
            sequence_order=1,
            status=TaskStatus.PENDING,
        )

        retro_chain = TaskChain(
            id=chain_id,
            project_id=self.id,
            title=title,
            chain_type=TaskChainType.RETROSPECTIVE,
            sequence_order=sequence_order,
            status=TaskStatus.PENDING,
            tasks=[retro_task],
        )

        self.task_chains.append(retro_chain)
        self._task_chains_map[retro_chain.id] = retro_chain
        for task in retro_chain.tasks:
            self._tasks_map[task.id] = task
        self.updated_at = datetime.now(timezone.utc)
        return retro_chain
