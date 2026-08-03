"""基础设施层日志模块"""

from app.infrastructure.logging.handler import SafeRotatingFileHandler

__all__ = ["SafeRotatingFileHandler"]
