"""事件消费者模块入口 (Consumers Module Entry)"""

import logging
from app.domain.book.events import BookCreatedEvent, BookParsedEvent
from app.domain.note.events import MaterialNoteCreatedEvent
from app.domain.project.events import ProjectCreatedEvent, ProjectArchivedEvent
from app.consumers.book_consumer import handle_book_created, handle_book_parsed
from app.consumers.graph_consumer import (
    handle_material_note_created,
    handle_book_parsed as handle_graph_book_parsed,
)
from app.consumers.project_consumer import handle_project_created, handle_project_archived
from app.infrastructure.event_bus.asyncio_event_bus import global_event_bus

logger = logging.getLogger(__name__)


def register_consumers() -> None:
    """注册所有领域事件消费者至全局事件总线"""
    global_event_bus.subscribe(BookCreatedEvent, handle_book_created)
    global_event_bus.subscribe(BookParsedEvent, handle_book_parsed)
    global_event_bus.subscribe(BookParsedEvent, handle_graph_book_parsed)
    global_event_bus.subscribe(ProjectCreatedEvent, handle_project_created)
    global_event_bus.subscribe(ProjectArchivedEvent, handle_project_archived)
    global_event_bus.subscribe(MaterialNoteCreatedEvent, handle_material_note_created)
    logger.info("已完成事件消费者注册: Book/Project/Graph 相关事件消费者")
