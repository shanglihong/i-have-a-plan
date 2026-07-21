"""
技能沙箱上下文 - 核心实体定义

Skill 生命周期：DRAFT -> SANDBOX -> ACTIVE
  - DRAFT：提炼编译中，尚未通过门禁校验
  - SANDBOX：进入 PA-03 门禁校验（DAG 环路检测）
  - ACTIVE：通过验证，可被项目任务调用
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class SandboxState(str, Enum):
    DRAFT = "DRAFT"
    SANDBOX = "SANDBOX"
    ACTIVE = "ACTIVE"


class Skill(SQLModel, table=True):
    """技能模版 DO - 聚合根"""

    __tablename__ = "skill"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    name: str = Field(index=True)
    sandbox_state: SandboxState = Field(default=SandboxState.DRAFT)
    # 物理存储路径（含 YAML 步骤定义）
    file_path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SkillStep(SQLModel, table=True):
    """技能步骤 DO"""

    __tablename__ = "skill_step"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    skill_id: str = Field(foreign_key="skill.id", index=True)
    step_id: str  # 步骤本地标识（在 Skill 内唯一）
    title: str
    # depends_on 步骤 ID 列表，存储为 JSON 字符串
    depends_on_json: str = Field(default="[]")
    order_index: int = Field(default=0)


# ---------------------------------------------------------------------------
# Domain Objects (内存充血模型)
# ---------------------------------------------------------------------------


class SkillStepDomain:
    """技能步骤充血模型 - 用于 PA-03 拓扑解环"""

    def __init__(self, do: SkillStep) -> None:
        self.do = do
        self.depends_on_steps: list[SkillStepDomain] = []

    @property
    def step_id(self) -> str:
        return self.do.step_id


class SkillDomain:
    """技能充血模型 - 装载步骤 DAG"""

    def __init__(self, do: Skill) -> None:
        self.do = do
        self.steps: list[SkillStepDomain] = []

    @property
    def id(self) -> str:
        return self.do.id
