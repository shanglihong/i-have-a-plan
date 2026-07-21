"""
项目与任务上下文 - 核心实体定义 (Domain Entities)

遵循数据模型规范的三层对象映射：
  - DO (Data Object)：与 SQLite 表结构严格映射，使用 SQLModel table=True
  - Domain Object：内存充血模型，装载聚合集合（不落库）
  - VO：由接入层负责转换，此处不定义

领域约束：
  - 零框架依赖（仅允许 SQLModel 作为数据类基类）
  - 枚举值完整对应架构规范
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


# ---------------------------------------------------------------------------
# 枚举定义
# ---------------------------------------------------------------------------


class ProjectType(str, Enum):
    READING = "READING"
    PLAN = "PLAN"


class ProjectStatus(str, Enum):
    INIT = "INIT"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    ARCHIVED = "ARCHIVED"


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"


# ---------------------------------------------------------------------------
# Data Objects (落库模型)
# ---------------------------------------------------------------------------


class Project(SQLModel, table=True):
    """项目 DO - 聚合根"""

    __tablename__ = "project"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    title: str = Field(index=True)
    type: ProjectType
    status: ProjectStatus = Field(default=ProjectStatus.INIT)
    deadline: Optional[datetime] = Field(default=None)
    assigned_agent_id: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Task(SQLModel, table=True):
    """任务 DO"""

    __tablename__ = "task"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    project_id: str = Field(foreign_key="project.id", index=True)
    title: str
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    parent_task_id: Optional[str] = Field(default=None, foreign_key="task.id")
    deadline: Optional[datetime] = Field(default=None)
    # depends_on_task_ids 存储为 JSON 字符串，由仓储层负责序列化/反序列化
    depends_on_task_ids_json: str = Field(default="[]")


# ---------------------------------------------------------------------------
# Domain Objects (内存充血模型，不落库)
# ---------------------------------------------------------------------------


class TaskDomain:
    """任务充血模型 - 装载子任务树与依赖关系"""

    def __init__(self, do: Task) -> None:
        self.do = do
        self.sub_tasks: list[TaskDomain] = []
        self.depends_on_tasks: list[TaskDomain] = []

    @property
    def id(self) -> str:
        return self.do.id

    @property
    def status(self) -> TaskStatus:
        return self.do.status


class ProjectDomain:
    """项目充血模型 - 装载任务树与笔记集合"""

    def __init__(self, do: Project) -> None:
        self.do = do
        self.tasks: list[TaskDomain] = []

    @property
    def id(self) -> str:
        return self.do.id
