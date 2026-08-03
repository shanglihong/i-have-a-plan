"""基础设施层日志 Handler 模块"""

import os
from logging.handlers import RotatingFileHandler
from app.utils.path import get_log_dir


class SafeRotatingFileHandler(RotatingFileHandler):
    """安全日志轮转 Handler，初始化及 open 时调用 path util 主动确保日志目录存在"""

    def __init__(self, filename, *args, **kwargs):
        log_dir = get_log_dir()
        log_dir.mkdir(parents=True, exist_ok=True)

        target_dir = os.path.dirname(filename)
        if target_dir:
            os.makedirs(target_dir, exist_ok=True)

        super().__init__(filename, *args, **kwargs)

    def _open(self):
        log_dir = get_log_dir()
        log_dir.mkdir(parents=True, exist_ok=True)

        target_dir = os.path.dirname(self.baseFilename)
        if target_dir:
            os.makedirs(target_dir, exist_ok=True)

        return super()._open()
