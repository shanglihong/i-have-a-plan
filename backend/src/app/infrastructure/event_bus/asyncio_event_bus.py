"""
基础设施层 - asyncio 事件总线

实现领域内部事件的发布/订阅机制。
不依赖外部中间件（RabbitMQ 等），使用 Python 内置 asyncio.Queue。

事件流转规则（参考架构图）：
  - NoteUpdatedEvent  -> 触发知识图谱增量构建
  - ProjectArchived   -> 触发经验笔记生成
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 领域事件基类
# ---------------------------------------------------------------------------


@dataclass
class DomainEvent:
    """领域事件基类"""

    event_type: str
    occurred_at: datetime = field(default_factory=datetime.utcnow)
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class NoteUpdatedEvent(DomainEvent):
    """笔记更新事件 - 触发知识图谱增量构建"""

    def __init__(self, note_id: str, project_id: str) -> None:
        super().__init__(
            event_type="NoteUpdated",
            payload={"note_id": note_id, "project_id": project_id},
        )


@dataclass
class ProjectArchivedEvent(DomainEvent):
    """项目归档事件 - 触发经验笔记生成"""

    def __init__(self, project_id: str) -> None:
        super().__init__(
            event_type="ProjectArchived",
            payload={"project_id": project_id},
        )


# ---------------------------------------------------------------------------
# 事件总线实现
# ---------------------------------------------------------------------------

EventHandler = Callable[[DomainEvent], Coroutine[Any, Any, None]]


class AsyncioEventBus:
    """
    基于 asyncio.Queue 的异步事件总线

    设计约定：
      - 发布方（领域层/应用层）调用 publish() 即返回，不阻塞请求主流程
      - 订阅方（守护任务）在后台异步消费队列
      - 单队列多 Handler 模式，广播分发
    """

    def __init__(self) -> None:
        self._queue: asyncio.Queue[DomainEvent] = asyncio.Queue()
        self._handlers: dict[str, list[EventHandler]] = {}
        self._running = False

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        """注册事件处理器"""
        self._handlers.setdefault(event_type, []).append(handler)

    async def publish(self, event: DomainEvent) -> None:
        """发布事件（非阻塞入队）"""
        await self._queue.put(event)

    async def start(self) -> None:
        """启动后台消费循环（在 FastAPI lifespan 中调用）"""
        self._running = True
        logger.info("EventBus 后台消费任务已启动")
        while self._running:
            try:
                event = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                handlers = self._handlers.get(event.event_type, [])
                for handler in handlers:
                    try:
                        await handler(event)
                    except Exception as exc:
                        logger.error(
                            "EventBus Handler 异常: event=%s, error=%s",
                            event.event_type,
                            exc,
                        )
                self._queue.task_done()
            except asyncio.TimeoutError:
                continue

    async def stop(self) -> None:
        """优雅停止消费循环"""
        self._running = False
        logger.info("EventBus 已停止")


# 全局单例
event_bus = AsyncioEventBus()
