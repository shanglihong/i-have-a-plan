"""Book Consumer 事件消费测试"""

import os
import shutil
import tempfile
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.domain.book.events import BookCreatedEvent, BookParsedEvent
from app.consumers.book_consumer import handle_book_created, handle_book_parsed
from app.consumers import register_consumers
from app.infrastructure.event_bus.asyncio_event_bus import global_event_bus, AsyncioEventBus


@pytest.fixture
def temp_sandbox():
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d, ignore_errors=True)


def test_register_consumers():
    """测试 register_consumers 注册 BookCreatedEvent 与 BookParsedEvent 处理器"""
    test_bus = AsyncioEventBus()
    with patch("app.consumers.global_event_bus", test_bus):
        register_consumers()
        assert BookCreatedEvent in test_bus._subscribers
        assert handle_book_created in test_bus._subscribers[BookCreatedEvent]
        assert BookParsedEvent in test_bus._subscribers
        assert handle_book_parsed in test_bus._subscribers[BookParsedEvent]


@pytest.mark.asyncio
async def test_handle_book_created_triggers_parsing(temp_sandbox):
    """测试 handle_book_created 事件处理器成功调用 parse_book"""
    event = BookCreatedEvent(
        book_id="bk_consumer_test_01",
        project_id="proj_01",
        file_name="test.txt",
        storage_path=os.path.join(temp_sandbox, "test.txt")
    )

    mock_parsing_engine = AsyncMock()
    mock_parsing_engine.parse_book.return_value = MagicMock(id="bk_consumer_test_01")

    with patch("app.consumers.book_consumer.BookParsingEngineService", return_value=mock_parsing_engine):
        await handle_book_created(event)
        mock_parsing_engine.parse_book.assert_called_once_with("bk_consumer_test_01")


@pytest.mark.asyncio
async def test_handle_book_parsed_triggers_task_creation():
    """测试 handle_book_parsed 事件处理器成功调用 mount_book_task_tree"""
    event = BookParsedEvent(
        book_id="bk_consumer_test_01",
        project_id="proj_01",
        toc_tree=[],
        total_chapters=0,
        total_words=0
    )
    mock_task_op_service = AsyncMock()
    with patch("app.consumers.book_consumer.TaskOperationDomainService", return_value=mock_task_op_service):
        await handle_book_parsed(event)
        mock_task_op_service.mount_book_task_tree.assert_called_once_with(
            project_id="proj_01",
            book_id="bk_consumer_test_01"
        )

