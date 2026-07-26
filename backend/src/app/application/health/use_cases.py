"""应用层启动自愈用例 (StartupHealingUseCase)"""

import logging
from typing import List

from app.application.healing.book_health import BookHealing
from app.application.healing.project_health import ProjectHealing
from app.infrastructure.db.session import get_async_session
from app.container import AppContainer
from app.domain.book.entities import HealingStatus

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
            # 图书解析与文件物理状态批量自愈
            await BookHealing(container).handle()
            # 项目冷启动自愈
            await ProjectHealing(container).handle()
