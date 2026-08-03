"""旁路图谱定时任务 Handler (Graph Scheduler Handler)

参考 Consumer 模式，专注于消费和处理 Graph Pending Blocks 定时逻辑。
"""

import logging
from app.infrastructure.db.session import get_async_session
from app.container import AppContainer

logger = logging.getLogger(__name__)


async def handle_pending_graph_blocks() -> None:
    """定时扫描并处理旁路图谱 PENDING 建图切片"""
    try:
        async for session in get_async_session():
            container = AppContainer(session)
            count = await container.process_pending_blocks_use_case.execute(limit=20)
            if count > 0:
                logger.info(f"[GraphScheduler] 定时扫描完成，成功处理 {count} 条待建图切片")
            break
    except Exception as e:
        logger.error(f"[GraphScheduler] 处理待建图切片异常: {str(e)}", exc_info=True)
