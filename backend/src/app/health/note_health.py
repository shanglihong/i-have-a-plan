from typing import List
from app.container import AppContainer
from app.domain.book.entities import HealingStatus, Book
import logging

logger = logging.getLogger(__name__)

class NoteHealing:
    def __init__(self, container: AppContainer):
        self.container = container

    async def handle(self) -> None:
        logger.info("笔记沙箱冷启动自愈扫描开始...")
        tmp, md = await self.container.note_operation_service.clean_orphaned_files()
        logger.info(f"处理结束，清理tmp:{len(tmp)}, md:{len(md)}")
