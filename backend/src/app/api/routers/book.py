"""书籍与物理锚点 API 路由模块 (含领域异常拦截机制)"""

import os
import shutil
import tempfile
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.path import get_workspace_dir
from app.api.deps import get_book_use_cases
from app.domain.book.exceptions import (
    BookDomainException,
    BookNotFoundException,
    InvalidStateTransitionException,
    UnsupportedBookFormatException,
    BookParsingFailedException,
    ChapterNotFoundException
)
from app.application.book.dtos import (
    BookResponseDTO, TocResponseDTO, ChapterContentResponseDTO, CreateBookRequestDTO
)

router = APIRouter(prefix="/api/books", tags=["Book Domain"])



@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_book(req: CreateBookRequestDTO, deps: dict = Depends(get_book_use_cases)):
    """在文件解析之前初始化创建 Book 记录实体 (状态设为 PENDING)"""
    create_use_case = deps["create_book_use_case"]
    try:
        dto: BookResponseDTO = await create_use_case.execute(req)
        return {"code": 201, "message": "success", "data": dto.model_dump()}
    except UnsupportedBookFormatException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": 400, "message": e.message, "data": None}
        )


@router.get("/{book_id}", response_model=dict)
async def get_book_metadata(book_id: str, deps: dict = Depends(get_book_use_cases)):
    """获取书籍描述元数据、物理路径与全生命周期解析状态"""
    get_metadata_use_case = deps["get_metadata_use_case"]
    try:
        dto: BookResponseDTO = await get_metadata_use_case.execute(book_id)
        return {"code": 200, "message": "success", "data": dto.model_dump()}
    except BookNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": 404, "message": e.message, "data": None}
        )


@router.get("/{book_id}/toc", response_model=dict)
async def get_book_toc(book_id: str, deps: dict = Depends(get_book_use_cases)):
    """获取书籍目录大纲树 parsed_structure"""
    get_toc_use_case = deps["get_toc_use_case"]
    try:
        dto: TocResponseDTO = await get_toc_use_case.execute(book_id)
        return {"code": 200, "message": "success", "data": dto.model_dump()}
    except BookNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": 404, "message": e.message, "data": None}
        )


@router.get("/{book_id}/chapters/{chapter_id}", response_model=dict)
async def get_chapter_content(
    book_id: str,
    chapter_id: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    deps: dict = Depends(get_book_use_cases)
):
    """从沙箱 parsed_content.json 懒加载指定章节 ContentBlock 切片数组"""
    get_content_use_case = deps["get_content_use_case"]
    try:
        dto: ChapterContentResponseDTO = await get_content_use_case.execute(
            book_id=book_id,
            chapter_id=chapter_id,
            offset=offset,
            limit=limit
        )
        return {"code": 200, "message": "success", "data": dto.model_dump()}
    except BookNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": 404, "message": e.message, "data": None}
        )
    except ChapterNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": 404, "message": e.message, "data": None}
        )
    except BookParsingFailedException as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": 422, "message": e.message, "data": None}
        )


@router.post("/parse-file", response_model=dict)
async def parse_book_file(
    file: UploadFile = File(...),
    project_id: str = Form(default="proj_default"),
    book_id: Optional[str] = Form(default=None),
    deps: dict = Depends(get_book_use_cases)
):
    file_name = file.filename.split(".")[0]
    ext = file.filename.split(".")[-1]

    parse_use_case = deps["parse_use_case"]
    actual_book_id = book_id or f"bk_{uuid.uuid4().hex[:8]}"
    book_dir = os.path.join(get_workspace_dir(), f"projects/{project_id}/books/{actual_book_id}")
    os.makedirs(book_dir, exist_ok=True)

    sandbox_file_path = os.path.join(book_dir, file.filename)

    content = await file.read()
    with open(sandbox_file_path, "wb") as f:
        f.write(content)

    try:
        dto: BookResponseDTO = await parse_use_case.execute_parse_file(
            project_id=project_id,
            file_name=file_name,
            src_file_path=sandbox_file_path,
            book_id=actual_book_id
        )
        return {"code": 200, "message": "success", "data": dto.model_dump()}
    except InvalidStateTransitionException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": 409, "message": e.message, "data": None}
        )
    except UnsupportedBookFormatException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": 400, "message": e.message, "data": None}
        )
    except BookDomainException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": 400, "message": e.message, "data": None}
        )


@router.post("/{book_id}/verify", response_model=dict)
async def verify_and_heal_book(book_id: str, deps: dict = Depends(get_book_use_cases)):
    """手动触发沙箱自愈校验接口"""
    healing_use_case = deps["healing_use_case"]
    result = await healing_use_case.execute(book_id)
    return {"code": 200, "message": "success", "data": result}
