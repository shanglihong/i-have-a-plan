"""图书自愈策略抽象基类模块"""

from abc import ABC, abstractmethod
from typing import Optional, Tuple
from app.domain.book.entities import Book, HealingStatus, ParsingStatus
from app.domain.book.ports import BookRepositoryPort, BookFileStoragePort
from app.domain.book.services.parsing_engine_service import BookParsingEngineService


class BaseBookHealer(ABC):
    """图书自愈策略抽象基类"""

    def __init__(
        self,
        repository: BookRepositoryPort,
        file_storage: BookFileStoragePort,
        parsing_engine: BookParsingEngineService,
    ):
        self.repository = repository
        self.file_storage = file_storage
        self.parsing_engine = parsing_engine

    @property
    @abstractmethod
    def target_status(self) -> Optional[ParsingStatus]:
        """所支持的图书解析状态 (若为 None 则表示匹配通用/所有状态)"""
        pass

    @abstractmethod
    async def heal(self, book: Book) -> Tuple[HealingStatus, Optional[Book]]:
        """执行单个图书实体的自愈校验与修复逻辑
        
        Returns:
            Tuple[HealingStatus, Optional[Book]]: (自愈状态码, 处理后的图书实体)
        """
        pass
