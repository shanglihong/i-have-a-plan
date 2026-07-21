"""
基础设施层 - 本地沙箱适配器

实现 application/ports/sandbox_port.py 中定义的 SandboxPort 接口。
安全机制：
  - 所有路径操作限制在 sandbox_root 目录内（Chroot 模拟）
  - 禁止路径穿越（../ 等绕过攻击）
"""
from __future__ import annotations

from pathlib import Path

from app.application.ports.sandbox_port import SandboxPort, SandboxViolationError


class LocalSandboxAdapter(SandboxPort):
    """
    本地目录沙箱适配器

    将所有文件操作限制在 sandbox_root 目录内。
    路径穿越尝试将触发 SandboxViolationError。
    """

    def __init__(self, sandbox_root: Path) -> None:
        self._root = sandbox_root.resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def _safe_resolve(self, relative_path: str) -> Path:
        """
        解析相对路径，确保最终路径仍在 sandbox_root 内。
        防止路径穿越攻击（如 ../../etc/passwd）。
        """
        target = (self._root / relative_path).resolve()
        if not str(target).startswith(str(self._root)):
            raise SandboxViolationError(
                f"路径穿越攻击拦截: '{relative_path}' 超出沙箱边界 '{self._root}'"
            )
        return target

    async def write_file(self, relative_path: str, content: str) -> Path:
        target = self._safe_resolve(relative_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return target

    async def read_file(self, relative_path: str) -> str:
        target = self._safe_resolve(relative_path)
        if not target.exists():
            raise FileNotFoundError(f"沙箱文件不存在: {relative_path}")
        return target.read_text(encoding="utf-8")

    async def validate_path(self, relative_path: str) -> bool:
        try:
            self._safe_resolve(relative_path)
            return True
        except SandboxViolationError:
            return False
