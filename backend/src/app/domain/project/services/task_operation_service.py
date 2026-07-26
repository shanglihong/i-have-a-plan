"""任务写操作与树挂载领域服务 (Domain Service)"""

import logging
from typing import Optional, List, Dict, Any

from app.domain.project.entities import Project
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort
from app.domain.project.events import ProjectCreatedEvent
from app.domain.book.services import BookTocQueryDomainService
from app.domain.common.ports import EventPublisherPort

logger = logging.getLogger(__name__)


class TaskOperationDomainService:
    """任务写操作与生成挂载领域服务"""

    def __init__(
        self,
        project_repo: ProjectRepositoryPort,
        task_repo: TaskRepositoryPort,
        book_toc_service: BookTocQueryDomainService,
        event_publisher: EventPublisherPort,
    ):
        self.project_repo = project_repo
        self.task_repo = task_repo
        self.book_toc_service = book_toc_service
        self.event_publisher = event_publisher

    async def mount_book_task_tree(
        self,
        project_id: str,
        book_id: str
    ) -> Optional[Project]:
        """
        根据 book_id 从 Book 领域服务查询获取大纲，自动挂载任务树并扭转项目状态为 ACTIVE
        """
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            logger.warning(f"挂载任务树失败，未找到项目: project_id={project_id}")
            return None

        toc_tree: List[Dict[str, Any]] = []
        try:
            _, toc_tree = await self.book_toc_service.get_toc_tree(book_id)
        except Exception as e:
            logger.error(f"获取 Book 大纲树失败 (book_id={book_id}): {e}", exc_info=True)

        # 挂载解析后的目录大纲树，并扭转项目为 ACTIVE
        project.attach_toc_tree(toc_tree, book_id=book_id)
        project.transit_to_active()

        # 持久化落盘
        await self.project_repo.save(project)
        if project.task_chains:
            await self.task_repo.save_task_chains(project.id, project.task_chains)

        # 全局广播项目就绪创建事件
        created_event = ProjectCreatedEvent(
            project_id=project.id,
            project_type=project.project_type.value,
            status=project.status.value,
        )
        await self.event_publisher.publish(created_event)

        logger.info(f"成功挂载图书大纲与任务树并激活项目: project_id={project_id}, book_id={book_id}")
        return project
