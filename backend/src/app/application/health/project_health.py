from app.container import AppContainer
from app.domain.book.entities import HealingStatus
import logging

logger = logging.getLogger(__name__)

class ProjectHealing:
    def __init__(self, container: AppContainer):
        self.container = container

    async def handle(self) -> None:
        # 图书解析与文件物理状态批量自愈
        # project_summaries: List[str] = await container.project_healing_service.trigger_startup_healing()
        # if project_summaries:
        #     logger.info(f"项目冷启动自愈完成，处理项目数: {len(project_summaries)}, 明细: {project_summaries}")