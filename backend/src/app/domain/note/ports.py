"""笔记与知识库仓储接口模块"""

from abc import abstractmethod
from typing import Optional, List
from app.domain.common.ports import DomainPort
from app.domain.note.entities import MaterialNote, SynthesizedNote


class NoteRepositoryPort(DomainPort):
    """笔记仓储防腐接口"""

    @abstractmethod
    async def get_material_note(self, note_id: str) -> Optional[MaterialNote]:
        pass

    @abstractmethod
    async def save_material_note(self, note: MaterialNote) -> None:
        pass

    @abstractmethod
    async def save_synthesized_note(self, note: SynthesizedNote) -> None:
        pass
