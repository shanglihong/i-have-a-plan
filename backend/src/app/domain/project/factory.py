"""Project 聚合根工程工厂 (ProjectFactory)"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from app.domain.project.entities import Project, ProjectType, ProjectStatus
from app.utils.snow import id_worker


class ProjectFactory:
    """Project 工厂类"""

    @staticmethod
    def build_plan_project(
        title: str,
        deadline: Optional[datetime] = None,
    ) -> Project:
        project_id = f"proj_{id_worker.next_id_str()}"
        now = datetime.now(timezone.utc)

        return Project(
            id=project_id,
            title=title,
            project_type=ProjectType.PLAN,
            status=ProjectStatus.INIT,
            deadline=deadline,
            created_at=now,
            updated_at=now,
        )

    @staticmethod
    def build_reading_project(
        title: str,
        project_id: Optional[str] = None,
        deadline: Optional[datetime] = None,
        book_id: Optional[str] = None,
    ) -> Project:
        project_id = project_id or f"proj_{id_worker.next_id_str()}"
        actual_book_id = book_id or f"bk_{id_worker.next_id_str()}"
        now = datetime.now(timezone.utc)

        return Project(
            id=project_id,
            title=title,
            project_type=ProjectType.READING,
            status=ProjectStatus.INIT,
            deadline=deadline,
            book_id=actual_book_id,
            created_at=now,
            updated_at=now,
        )
