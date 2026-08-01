"""启动全局自愈用例 (StartupHealingUseCase)"""

import logging
from typing import List

from app.health.book_health import BookHealing
from app.health.graph_health import GraphHealing
from app.health.note_health import NoteHealing
from app.health.project_health import ProjectHealing
from app.infrastructure.db.session import get_async_session
from app.container import AppContainer

logger = logging.getLogger(__name__)


class StartupHealingUseCase:
    """冷启动系统全局自愈编排应用服务用例"""

    async def execute(self) -> None:
        """
        系统启动时在 Lifespan 钩子中被调用：
        """
        logger.info("开始执行系统冷启动全局自愈扫描...")
        async for session in get_async_session():
            container = AppContainer(session)
            await BookHealing(container).handle()
            await ProjectHealing(container).handle()
            await NoteHealing(container).handle()
            await GraphHealing(container).handle()
