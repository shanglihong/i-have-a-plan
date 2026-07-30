"""LRU 缓存工具组件"""

from collections import OrderedDict
from typing import Any, Optional, TypeVar, Generic

T = TypeVar("T")


class LRUCache(Generic[T]):
    """基于 OrderedDict 实现的通用 LRU (Least Recently Used) 内存缓存组件"""

    def __init__(self, capacity: int = 100):
        if capacity <= 0:
            raise ValueError("LRUCache 容量必须大于 0")
        self.capacity = capacity
        self.cache: OrderedDict[Any, T] = OrderedDict()

    def get(self, key: Any) -> Optional[T]:
        """获取缓存。若存在则将其移至最新使用位置并返回，不存在则返回 None"""
        if key not in self.cache:
            return None
        self.cache.move_to_end(key)
        return self.cache[key]

    def set(self, key: Any, value: T) -> None:
        """设置或更新缓存。若超出 capacity 则弹出最早最少使用的项"""
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

    def remove(self, key: Any) -> bool:
        """从缓存中移除指定 key，存在并移除成功返回 True，不存在返回 False"""
        if key in self.cache:
            del self.cache[key]
            return True
        return False

    def clear(self) -> None:
        """清空缓存"""
        self.cache.clear()

    def __contains__(self, key: Any) -> bool:
        return key in self.cache

    def __len__(self) -> int:
        return len(self.cache)
