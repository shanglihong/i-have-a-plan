"""笔记与知识库领域上下文包"""

from .entities import (
    MaterialNote,
    SynthesizedNote,
    KnowledgeBase,
    SynthesizedNoteType,
    SourceType,
    BlockType,
    SourceAnchor,
    DocumentBlock,
)
from .events import (
    MaterialNoteCreatedEvent,
    SynthesizedNoteCreatedEvent,
    MaterialNoteDeletedEvent,
    SynthesizedNoteDeletedEvent,
)
from .ports import (
    IMaterialNoteRepositoryPort,
    ISynthesizedNoteRepositoryPort,
    KnowledgeBaseRepositoryPort,
    IMaterialNoteDomainService,
    ISynthesizedNoteDomainService,
    INoteFileStoragePort,
)
from .service import (
    NoteQueryDomainService,
    NoteStateDomainService,
    NoteOperationDomainService,
    KnowledgeBaseDomainService,
)
from .factory import NoteMarkdownFactory

__all__ = [
    "MaterialNote",
    "SynthesizedNote",
    "KnowledgeBase",
    "SynthesizedNoteType",
    "SourceType",
    "BlockType",
    "SourceAnchor",
    "DocumentBlock",
    "MaterialNoteCreatedEvent",
    "SynthesizedNoteCreatedEvent",
    "MaterialNoteDeletedEvent",
    "SynthesizedNoteDeletedEvent",
    "IMaterialNoteRepositoryPort",
    "ISynthesizedNoteRepositoryPort",
    "KnowledgeBaseRepositoryPort",
    "IMaterialNoteDomainService",
    "ISynthesizedNoteDomainService",
    "INoteFileStoragePort",
    "NoteMarkdownFactory",
    "NoteQueryDomainService",
    "NoteStateDomainService",
    "NoteOperationDomainService",
    "KnowledgeBaseDomainService",
]
