"""应用层安全沙箱防腐接口 (Sandbox Port) 模块

落实 PA-05 安全隔离契约。
"""

from abc import ABC, abstractmethod
from typing import Dict, Any


class SandboxPort(ABC):
    """SandboxPort 安全沙箱控制契约接口"""

    @abstractmethod
    async def execute_in_sandbox(self, code: str, inputs: Dict[str, Any]) -> str:
        """在隔离受限进程与 Pipe 管道中安全执行试运转"""
        pass
