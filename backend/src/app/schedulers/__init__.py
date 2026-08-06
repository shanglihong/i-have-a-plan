"""定时任务调度模块入口 (Schedulers Module Entry)

统一管理系统所有 Cron / Interval 定时任务的注册与生命周期。
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.schedulers.graph_scheduler import handle_pending_graph_blocks

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def register_schedulers() -> AsyncIOScheduler:
    """注册全局 Cron / Interval 定时任务"""
    # scheduler.add_job(
    #     handle_pending_graph_blocks,
    #     "interval",
    #     seconds=10,
    #     id="handle_pending_graph_blocks_job",
    #     replace_existing=True,
    # )
    logger.info("已完成定时任务调度注册: Graph Pending Blocks 相关定时任务")
    return scheduler
