"""项目与任务领域实体模块

包含 Project 聚合根, TaskChain 中观容器, Task 微观执行单元等领域模型。
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from app.domain.base import BaseEntity
from app.domain.book.entities import Book


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


@dataclass
class Task(BaseEntity):
    """Task 微观执行单元"""
    title: str = ""
    description: str = ""
    status: TaskStatus = TaskStatus.PENDING
    sequence_order: int = 1
    task_chain_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    depends_on_task_ids: List[str] = field(default_factory=list)  # 依赖项的任务 ID 列表 (DAG)

    def mark_completed(self) -> None:
        self.status = TaskStatus.COMPLETED
        self.updated_at = datetime.now(timezone.utc)


@dataclass
class TaskChain(BaseEntity):
    """TaskChain 中观容器"""
    title: str = ""
    chain_type: TaskChainType = TaskChainType.DEFAULT
    sequence_order: int = 1
    status: TaskStatus = TaskStatus.PENDING
    project_id: Optional[str] = None
    book_id: Optional[str] = None
    chapter_id: Optional[str] = None
    tasks: List[Task] = field(default_factory=list)

    @property
    def is_completed(self) -> bool:
        if not self.tasks:
            return self.status == TaskStatus.COMPLETED
        return all(t.status == TaskStatus.COMPLETED for t in self.tasks)


@dataclass
class Project(BaseEntity):
    """Project 聚合根 (充血模型)"""
    title: str = ""
    description: str = ""
    project_type: ProjectType = ProjectType.READING
    status: ProjectStatus = ProjectStatus.INIT
    assigned_agent_id: Optional[str] = None
    deadline: Optional[datetime] = None
    book_id: Optional[str] = None
    book: Optional[Book] = None
    tags: List[str] = field(default_factory=list)
    task_chains: List[TaskChain] = field(default_factory=list)

    @property
    def progress(self) -> int:
        """根据关联任务算项目整体完成进度 (%)"""
        all_tasks: List[Task] = []
        for chain in self.task_chains:
            all_tasks.extend(chain.tasks)
        if not all_tasks:
            return 100 if self.status == ProjectStatus.ARCHIVED else 0
        completed = sum(1 for t in all_tasks if t.status == TaskStatus.COMPLETED)
        return int((completed / len(all_tasks)) * 100)

    def bind_agent(self, agent_id: str) -> None:
        """绑定 Agent 句柄 ID"""
        self.assigned_agent_id = agent_id
        self.updated_at = datetime.now(timezone.utc)

    def attach_task_tree(self, task_chains: List[TaskChain]) -> None:
        """挂载生成的任务树」"""
        self.task_chains = task_chains
        self.updated_at = datetime.now(timezone.utc)

    def attach_toc_tree(self, toc_tree: List[dict], book_id: str) -> None:
        """根据 Book 目录大纲树实例化 READING_CHAPTER 任务链树"""
        self.book_id = book_id
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
                book_id=book_id,
                chapter_id=chapter_id,
                tasks=[read_task],
            )
            chains.append(chain)

        self.task_chains = chains
        self.updated_at = datetime.now(timezone.utc)

    def transit_to_active(self) -> None:
        """从 INIT 状态转换为 ACTIVE"""
        if self.status != ProjectStatus.INIT:
            raise ValueError(f"无法将状态为 {self.status.value} 的项目转为 ACTIVE")
        self.status = ProjectStatus.ACTIVE
        self.updated_at = datetime.now(timezone.utc)

    def archive(self) -> None:
        """从 ACTIVE 状态转为 ARCHIVED 归档"""
        if self.status != ProjectStatus.ACTIVE:
            raise ValueError(f"只有 ACTIVE 状态的项目才能归档，当前状态为: {self.status.value}")
        self.status = ProjectStatus.ARCHIVED
        self.updated_at = datetime.now(timezone.utc)

    def reactivate(self) -> None:
        """从 ARCHIVED 转为 ACTIVE 重激活"""
        if self.status != ProjectStatus.ARCHIVED:
            raise ValueError(f"只有 ARCHIVED 状态的项目才能重新激活，当前状态为: {self.status.value}")
        self.status = ProjectStatus.ACTIVE
        self.updated_at = datetime.now(timezone.utc)

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
        self.updated_at = datetime.now(timezone.utc)
        return retro_chain
