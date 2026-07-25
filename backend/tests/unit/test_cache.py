"""LRUCache 单元测试"""

import pytest
from app.utils.cache import LRUCache


def test_lru_cache_basic_get_set():
    cache: LRUCache[str] = LRUCache(capacity=3)
    cache.set("a", "alpha")
    cache.set("b", "beta")

    assert cache.get("a") == "alpha"
    assert cache.get("b") == "beta"
    assert cache.get("c") is None
    assert len(cache) == 2
    assert "a" in cache


def test_lru_cache_eviction():
    cache: LRUCache[int] = LRUCache(capacity=3)
    cache.set("k1", 1)
    cache.set("k2", 2)
    cache.set("k3", 3)

    # 访问 k1，使其变为最近使用
    _ = cache.get("k1")

    # 插入 k4，最少使用的 k2 应该被淘汰
    cache.set("k4", 4)

    assert cache.get("k2") is None
    assert cache.get("k1") == 1
    assert cache.get("k3") == 3
    assert cache.get("k4") == 4
    assert len(cache) == 3


def test_lru_cache_update():
    cache: LRUCache[str] = LRUCache(capacity=2)
    cache.set("k1", "v1")
    cache.set("k2", "v2")

    # 更新 k1 的值
    cache.set("k1", "v1_updated")

    # 插入 k3，应该淘汰 k2
    cache.set("k3", "v3")

    assert cache.get("k1") == "v1_updated"
    assert cache.get("k2") is None
    assert cache.get("k3") == "v3"


def test_lru_cache_remove_and_clear():
    cache: LRUCache[str] = LRUCache(capacity=5)
    cache.set("k1", "v1")
    cache.set("k2", "v2")

    assert cache.remove("k1") is True
    assert cache.remove("non_existent") is False
    assert cache.get("k1") is None
    assert len(cache) == 1

    cache.clear()
    assert len(cache) == 0
    assert cache.get("k2") is None


def test_lru_cache_invalid_capacity():
    with pytest.raises(ValueError):
        LRUCache(capacity=0)
