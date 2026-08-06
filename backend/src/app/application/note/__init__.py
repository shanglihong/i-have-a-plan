"""笔记与沉淀笔记应用服务模块"""

from .dtos import (
    CreateMaterialNoteDTO,
    UpdateMaterialNoteDTO,
    MaterialNoteVO,
    MaterialNotePageVO,
    CreateSynthesizedNoteDTO,
    UpdateSynthesizedNoteDTO,
    SynthesizedNoteVO,
    SynthesizedNoteDetailVO,
    DeleteResponseVO,
)
from .use_cases import (
    CreateMaterialNoteUseCase,
    GetMaterialNotesUseCase,
    UpdateMaterialNoteUseCase,
    DeleteMaterialNoteUseCase,
    CreateSynthesizedNoteUseCase,
    GetSynthesizedNoteUseCase,
    UpdateSynthesizedNoteUseCase,
    DeleteSynthesizedNoteUseCase,
    UnbindKnowledgeBaseNotesUseCase,
    CorrectNoteAnchorUseCase,
)

__all__ = [
    "CreateMaterialNoteDTO",
    "UpdateMaterialNoteDTO",
    "MaterialNoteVO",
    "MaterialNotePageVO",
    "CreateSynthesizedNoteDTO",
    "UpdateSynthesizedNoteDTO",
    "SynthesizedNoteVO",
    "SynthesizedNoteDetailVO",
    "DeleteResponseVO",
    "CreateMaterialNoteUseCase",
    "GetMaterialNotesUseCase",
    "UpdateMaterialNoteUseCase",
    "DeleteMaterialNoteUseCase",
    "CreateSynthesizedNoteUseCase",
    "GetSynthesizedNoteUseCase",
    "UpdateSynthesizedNoteUseCase",
    "DeleteSynthesizedNoteUseCase",
    "UnbindKnowledgeBaseNotesUseCase",
    "CorrectNoteAnchorUseCase",
]
