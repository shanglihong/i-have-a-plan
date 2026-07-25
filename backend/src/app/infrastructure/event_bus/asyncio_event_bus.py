"""基于 asyncio 的轻量内存事件总线基础组件 (Domain-Agnostic Infrastructure)"""

import asyncio
import logging
from typing import Callable, Dict, List, Type, Any

logger = logging.getLogger(__name__)


class AsyncioEventBus:
    """基于内存和 asyncio 任务队列的通用基础事件总线"""

    def __init__(self):
        self._subscribers: Dict[Type[Any], List[Callable[[Any], Any]]] = {}

    def subscribe(self, event_type: Type[Any], handler: Callable[[Any], Any]) -> None:
        """注册特定事件类型的处理回调"""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    async def publish(self, event: Any) -> None:
        """异步发布事件对象给所有订阅方"""
        event_type = type(event)
        handlers = self._subscribers.get(event_type, [])
        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    asyncio.create_task(handler(event))
                else:
                    handler(event)
            except Exception as e:
                logger.error(f"EventBus 消费事件处理失败 ({event_type.__name__}): {e}", exc_info=True)


# 全局通用内存事件总线单例
global_event_bus = AsyncioEventBus()
