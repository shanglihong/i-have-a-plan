"""技能与沙箱审校领域实体模块"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional
from app.domain.common.base_entity import BaseEntity


class SkillStatus(str, Enum):
    """技能审校与入库状态"""
    DRAFT = "DRAFT"
    IN_REVIEW = "IN_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


@dataclass
class SkillStep:
    """SkillStep 步骤节点"""
    step_num: int = 1
    title: str = ""
    instruction: str = ""
    dependencies: List[int] = field(default_factory=list)


@dataclass
class SandboxContext:
    """SandboxContext 沙箱隔离中枢 (四大职责隔离)"""
    session_id: str = ""
    is_network_allowed: bool = False
    is_shell_allowed: bool = False
    is_write_core_disk_allowed: bool = False


@dataclass
class Skill(BaseEntity):
    """Skill 聚合根"""
    name: str = ""
    description: str = ""
    status: SkillStatus = SkillStatus.DRAFT
    steps: List[SkillStep] = field(default_factory=list)
    sandbox_ctx: Optional[SandboxContext] = None
