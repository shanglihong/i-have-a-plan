"""技能与沙箱审校领域事件模块"""

from dataclasses import dataclass
from app.domain.common.events import DomainEvent


@dataclass
class SkillApproved(DomainEvent):
    """技能批准入库事件"""
    skill_id: str = ""


@dataclass
class SkillCompiled(DomainEvent):
    """Trace-to-Skill 编译生成临时技能事件"""
    skill_id: str = ""
