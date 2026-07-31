from app.container import AppContainer
import logging

from app.domain.project import Project, ProjectType
from app.application.project.use_cases import MountBookTaskTreeUseCase

logger = logging.getLogger(__name__)

class ProjectHealing:
    def __init__(self, container: AppContainer):
        self.container = container

    async def handle(self) -> None:
        init_projects = await self.container.project_query_service.get_recent_init_list()
        for project in init_projects:
            if project.project_type == ProjectType.READING and project.book_id:
                use_case = MountBookTaskTreeUseCase(
                    book_service=self.container.book_service,
                    task_op_service=self.container.task_op_service,
                )
                await use_case.execute(project.id, project.book_id)
        return
