"""应用层启动自愈用例 (StartupHealingUseCase)"""

import logging
from typing import List
from app.infrastructure.db.session import get_async_session
from app.container import AppContainer
from app.domain.book.entities import HealingStatus

logger = logging.getLogger(__name__)


class StartupHealingUseCase:
    """冷启动系统全局自愈编排应用服务用例"""

    async def execute(self) -> None:
        """
        系统启动时在 Lifespan 钩子中被调用：
        通过 AppContainer 检索依赖，执行：
        1. 扫描半成品 INIT 项目并根据项目类型做自愈处理
        2. 扫描并自愈异常图书及其 JSON 物理文件
        """
        logger.info("开始执行系统冷启动全局自愈扫描...")
        async for session in get_async_session():
            container = AppContainer(session)

            # 图书解析与文件物理状态批量自愈
            book_results, total_books = await container.book_healing_service.batch_verify_and_heal_books(page=1, size=100)
            if book_results:
                healed_count = sum(1 for _, status in book_results if status != HealingStatus.INTACT)
                logger.info(f"图书冷启动物理自愈校验完成，已检查图书: {total_books}, 修复异常数: {healed_count}")

            # 项目冷启动自愈
            project_summaries: List[str] = await container.project_healing_service.trigger_startup_healing()
            if project_summaries:
                logger.info(f"项目冷启动自愈完成，处理项目数: {len(project_summaries)}, 明细: {project_summaries}")
