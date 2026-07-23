"""项目与任务领域实体模块

包含 Project 聚合根, TaskChain 中观容器, Task 微观执行单元等领域模型。
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional
from app.domain.common.base_entity import BaseEntity


class ProjectType(str, Enum):
    """项目类型类型定义"""
    READING = "READING"
    PLAN = "PLAN"


class TaskChainType(str, Enum):
    """任务链类型定义"""
    READING_CHAPTER = "READING_CHAPTER"
    PLAN_STAGE = "PLAN_STAGE"


class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"


@dataclass
class Task(BaseEntity):
    """Task 微观执行单元"""
    title: str = ""
    description: str = ""
    status: TaskStatus = TaskStatus.PENDING
    dependencies: List[str] = field(default_factory=list)  # 依赖项的任务 ID 列表 (DAG)


@dataclass
class TaskChain(BaseEntity):
    """TaskChain 中观容器"""
    title: str = ""
    chain_type: TaskChainType = TaskChainType.READING_CHAPTER
    tasks: List[Task] = field(default_factory=list)


@dataclass
class Project(BaseEntity):
    """Project 聚合根"""
    title: str = ""
    description: str = ""
    project_type: ProjectType = ProjectType.READING
    task_chains: List[TaskChain] = field(default_factory=list)
