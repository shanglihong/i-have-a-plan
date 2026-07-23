"""技能与沙箱审校仓储接口模块"""

from abc import abstractmethod
from typing import Optional, List
from app.domain.common.ports import DomainPort
from app.domain.skill.entities import Skill


class SkillRepositoryPort(DomainPort):
    """Skill 仓储防腐接口"""

    @abstractmethod
    async def get_by_id(self, skill_id: str) -> Optional[Skill]:
        pass

    @abstractmethod
    async def save(self, skill: Skill) -> None:
        pass
