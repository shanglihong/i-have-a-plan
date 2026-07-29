"""物理路径与工作空间处理工具函数"""

import os
from pathlib import Path


def get_workspace_dir() -> Path:
    """获取工作空间绝对路径 (优先使用 WORKSPACE_DIR 环境变量，默认使用当前工作目录)"""
    return Path(os.getenv("WORKSPACE_DIR") or os.getcwd()).expanduser().resolve()

def get_project_dir() -> Path:
    return Path(get_workspace_dir()) / "projects"

def get_book_dir(id: str) -> Path:
    return Path(get_workspace_dir()) / "projects" / id

def get_note_dir() -> Path:
    return Path(get_workspace_dir()) / "notes"

