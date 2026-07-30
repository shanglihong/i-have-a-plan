"""策略工厂与对外接口暴露"""

import os
from typing import Dict, Callable
from app.infrastructure.llm.strategies.base import ContextCompressStrategy, CompressStrategyType
from app.infrastructure.llm.strategies.sliding_window import SlidingWindowCompressStrategy
from app.infrastructure.llm.strategies.noop import NoOpCompressStrategy


def _get_keep_turns() -> int:
    """从环境变量获取保留轮数，解析失败则默认为 10"""
    keep_turns_str = os.getenv("LLM_COMPRESS_KEEP_TURNS") or "10"
    try:
        return int(keep_turns_str)
    except ValueError:
        return 10


# 注册策略类实例化函数，避免 if/else
_STRATEGY_CREATORS: Dict[CompressStrategyType, Callable[[], ContextCompressStrategy]] = {
    CompressStrategyType.SLIDING_WINDOW: lambda: SlidingWindowCompressStrategy(
        keep_turns=_get_keep_turns()
    ),
    CompressStrategyType.NOOP: lambda: NoOpCompressStrategy(),
}


def get_compress_strategy(strategy_type: str) -> ContextCompressStrategy:
    """策略工厂函数，根据策略类型返回对应的策略实例"""
    try:
        enum_type = CompressStrategyType(strategy_type.upper())
    except ValueError:
        enum_type = CompressStrategyType.SLIDING_WINDOW

    creator = _STRATEGY_CREATORS.get(enum_type)
    if not creator:
        return SlidingWindowCompressStrategy(keep_turns=_get_keep_turns())
    return creator()


__all__ = [
    "ContextCompressStrategy",
    "CompressStrategyType",
    "SlidingWindowCompressStrategy",
    "NoOpCompressStrategy",
    "get_compress_strategy",
]
