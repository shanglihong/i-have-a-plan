from app.container import AppContainer
from app.domain.book.entities import HealingStatus
import logging

logger = logging.getLogger(__name__)

class BookHealing:
    def __init__(self, container: AppContainer):
        self.container = container

    async def handle(self) -> None:
        # 图书解析与文件物理状态批量自愈
        book_results, total_books = await self.container.book_healing_service.batch_verify_and_heal_books(page=1, size=100)
        if book_results:
            healed_count = sum(1 for _, status in book_results if status != HealingStatus.INTACT)
            logger.info(f"图书冷启动物理自愈校验完成，已检查图书: {total_books}, 修复异常数: {healed_count}")