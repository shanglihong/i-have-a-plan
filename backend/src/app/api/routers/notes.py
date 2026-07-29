"""
接入层 - 笔记路由

覆盖 API 规范 2.4：融合笔记 API 规范 (Note Domain)
  - POST /api/notes/material          创建素材笔记
  - GET  /api/notes/material          查询素材笔记列表 (支持跨项目)
  - POST /api/notes/synthesize        提炼创建沉淀笔记 (飞书式 Block)
  - GET  /api/notes/synthesize/{id}   获取沉淀笔记详情
  - PUT  /api/notes/synthesize/{id}   更新沉淀笔记内容
  - DELETE /api/notes/synthesize/{id} 删除沉淀笔记
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query

from app.api.deps import get_note_use_cases
from app.api.response import ApiResponse, success_response
from app.application.note.dtos import (
    CreateMaterialNoteDTO,
    SourceAnchorDTO,
    MaterialNoteVO,
    MaterialNotePageVO,
    CreateSynthesizedNoteDTO,
    SynthesizedNoteVO,
    SynthesizedNoteDetailVO,
    UpdateSynthesizedNoteDTO,
    DeleteResponseVO,
)

router = APIRouter(prefix="/api", tags=["notes"])


@router.post(
    "/notes/material",
    response_model=ApiResponse[MaterialNoteVO],
    status_code=201,
    summary="创建素材笔记"
)
async def create_material_note(
    dto: CreateMaterialNoteDTO,
    use_cases: dict = Depends(get_note_use_cases)
):
    uc = use_cases["create_material_use_case"]
    result = await uc.execute(dto)
    return success_response(data=result, code=201, message="created")


@router.get(
    "/notes/material",
    response_model=ApiResponse[MaterialNotePageVO],
    summary="查询素材笔记列表 (支持跨项目)"
)
async def list_material_notes(
    project_id: Optional[str] = Query(None, description="过滤指定项目。省略时表示跨项目全局拉取。"),
    cursor: Optional[str] = Query(None, description="分页游标"),
    limit: int = Query(15, description="每页数量"),
    keyword: Optional[str] = Query(None, description="检索关键字"),
    use_cases: dict = Depends(get_note_use_cases)
):
    uc = use_cases["get_material_use_case"]
    result = await uc.execute(
        project_id=project_id,
        cursor=cursor,
        limit=limit,
        keyword=keyword
    )
    return success_response(data=result)


@router.post(
    "/notes/synthesize",
    response_model=ApiResponse[SynthesizedNoteVO],
    status_code=201,
    summary="提炼创建沉淀笔记 (飞书式 Block)"
)
async def create_synthesized_note(
    dto: CreateSynthesizedNoteDTO,
    use_cases: dict = Depends(get_note_use_cases)
):
    uc = use_cases["create_synthesized_use_case"]
    result = await uc.execute(dto)
    return success_response(data=result, code=201, message="created")


@router.get(
    "/notes/synthesize/{note_id}",
    response_model=ApiResponse[SynthesizedNoteDetailVO],
    summary="获取沉淀笔记详情"
)
async def get_synthesized_note(
    note_id: str,
    use_cases: dict = Depends(get_note_use_cases)
):
    uc = use_cases["get_synthesized_use_case"]
    result = await uc.execute(note_id)
    return success_response(data=result)


@router.put(
    "/notes/synthesize/{note_id}",
    response_model=ApiResponse[SynthesizedNoteVO],
    summary="更新沉淀笔记内容"
)
async def update_synthesized_note(
    note_id: str,
    dto: UpdateSynthesizedNoteDTO,
    use_cases: dict = Depends(get_note_use_cases)
):
    uc = use_cases["update_synthesized_use_case"]
    result = await uc.execute(note_id, dto)
    return success_response(data=result)


@router.delete(
    "/notes/synthesize/{note_id}",
    response_model=ApiResponse[DeleteResponseVO],
    summary="删除沉淀笔记"
)
async def delete_synthesized_note(
    note_id: str,
    use_cases: dict = Depends(get_note_use_cases)
):
    uc = use_cases["delete_synthesized_use_case"]
    result = await uc.execute(note_id)
    return success_response(data=result)


@router.put(
    "/notes/material/{note_id}/correct",
    response_model=ApiResponse[None],
    summary="纠正素材笔记高亮锚点坐标"
)
async def correct_note_anchor(
    note_id: str,
    dto: SourceAnchorDTO,
    use_cases: dict = Depends(get_note_use_cases)
):
    uc = use_cases["correct_anchor_use_case"]
    await uc.execute(note_id, dto)
    return success_response(data=None, message="corrected")
