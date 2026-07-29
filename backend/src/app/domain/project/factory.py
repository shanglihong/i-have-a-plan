"""Project 聚合根工程工厂 (ProjectFactory)"""

from datetime import datetime, timezone
from typing import Optional
from app.domain.project.entities import Project, ProjectType, ProjectStatus


class ProjectFactory:
    """Project 工厂类"""

    @staticmethod
    def build_plan_project(
        title: str,
        deadline: Optional[datetime] = None,
    ) -> Project:
        now = datetime.now(timezone.utc)
        return Project(
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
        now = datetime.now(timezone.utc)
        p = Project(
            title=title,
            project_type=ProjectType.READING,
            status=ProjectStatus.INIT,
            deadline=deadline,
            book_id=book_id,
            created_at=now,
            updated_at=now,
        )
        if project_id:
            p.project_id = project_id
        return p
