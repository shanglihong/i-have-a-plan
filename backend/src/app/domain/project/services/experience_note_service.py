"""归档项目经验笔记生成领域服务 (Domain Service)"""

import uuid
from datetime import datetime, timezone
from typing import Tuple
from app.domain.project.ports import ProjectRepositoryPort


class ExperienceNoteDomainService:
    """归档卡片生成经验笔记领域服务"""

    def __init__(self, repository: ProjectRepositoryPort):
        self.repository = repository

    async def create_experience_note(self, project_id: str, content: str = "") -> Tuple[str, str, datetime]:
        project = await self.repository.get_by_id(project_id)
        if not project:
            raise KeyError(f"未找到项目: {project_id}")

        note_id = f"note_exp_{uuid.uuid4().hex[:16]}"
        now = datetime.now(timezone.utc)
        return project_id, note_id, now
