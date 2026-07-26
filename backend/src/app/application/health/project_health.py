from app.container import AppContainer
from app.domain.book.entities import HealingStatus
import logging

from app.domain.project import Project, ProjectType

logger = logging.getLogger(__name__)

class ProjectHealing:
    def __init__(self, container: AppContainer):
        self.container = container

    async def handle(self) -> None:
        init_projects = await self.container.project_query_service.get_recent_init_list()
        for project in init_projects:
            if project.project_type == ProjectType.READING:
                _, toc_tree = await self.container.book_service.get_toc_tree(project.book_id)
                # 生成阅读task树并激活
                if toc_tree:
                    self.container.task_op_service.mount_task_tree_and_activate(project.id, project.book_id, toc_tree)
        return