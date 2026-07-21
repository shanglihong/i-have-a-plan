"""
应用级防腐接口 - Sandbox Port

定义应用层与本地安全沙箱的抽象契约。
沙箱承担：目录 Chroot 隔离、工具白名单拦截、受限 I/O 代理。
实现方位于基础设施层 (local_sandbox_adapter.py)。
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path


class SandboxViolationError(Exception):
    """沙箱安全拦截：非法 I/O 或超出工具白名单"""

    def __init__(self, reason: str) -> None:
        super().__init__(f"沙箱安全拦截: {reason}")


class SandboxPort(ABC):
    """安全沙箱接口 (Application Port)"""

    @abstractmethod
    async def write_file(self, relative_path: str, content: str) -> Path:
        """
        在沙箱受限目录内写入文件。
        非法路径（如 ../escape）将触发 SandboxViolationError。
        """
        ...

    @abstractmethod
    async def read_file(self, relative_path: str) -> str:
        """在沙箱受限目录内读取文件内容。"""
        ...

    @abstractmethod
    async def validate_path(self, relative_path: str) -> bool:
        """校验路径是否在白名单范围内，不抛异常仅返回布尔值。"""
        ...
