"""书籍 API 路由模块"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, status

from fastapi.responses import FileResponse
from app.utils.path import get_workspace_dir
from app.api.deps import get_book_use_cases
from app.api.response import success_response, ResponseCode
from app.application.book.dtos import (
    BookResponseDTO, TocResponseDTO, ChapterContentResponseDTO, CreateBookRequestDTO
)

router = APIRouter(prefix="/api/books", tags=["Book Domain"])


@router.get("/{book_id}/images/{image_name:path}")
async def get_book_image(
    book_id: str,
    image_name: str,
    deps: dict = Depends(get_book_use_cases)
):
    """获取解析提取的图书图片物理文件资源"""
    get_image_use_case = deps["get_image_use_case"]
    image_path = await get_image_use_case.execute(book_id=book_id, image_name=image_name)
    return FileResponse(image_path)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_book(req: CreateBookRequestDTO, deps: dict = Depends(get_book_use_cases)):
    """创建 Book 记录"""
    create_use_case = deps["create_book_use_case"]
    dto: BookResponseDTO = await create_use_case.execute(req)
    return success_response(dto, code=ResponseCode.CREATED)


@router.get("/{book_id}", response_model=dict)
async def get_book_metadata(book_id: str, deps: dict = Depends(get_book_use_cases)):
    """获取书籍详情元数据"""
    get_metadata_use_case = deps["get_metadata_use_case"]
    dto: BookResponseDTO = await get_metadata_use_case.execute(book_id)
    return success_response(dto)


@router.get("/{book_id}/toc", response_model=dict)
async def get_book_toc(book_id: str, deps: dict = Depends(get_book_use_cases)):
    """获取书籍目录大纲树"""
    get_toc_use_case = deps["get_toc_use_case"]
    dto: TocResponseDTO = await get_toc_use_case.execute(book_id)
    return success_response(dto)


@router.get("/{book_id}/chapters/{chapter_id}", response_model=dict)
async def get_chapter_content(
    book_id: str,
    chapter_id: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    deps: dict = Depends(get_book_use_cases)
):
    """获取指定章节内容切片"""
    get_content_use_case = deps["get_content_use_case"]
    dto: ChapterContentResponseDTO = await get_content_use_case.execute(
        book_id=book_id,
        chapter_id=chapter_id,
        offset=offset,
        limit=limit
    )
    return success_response(dto)


@router.post("/parse-file", response_model=dict)
async def parse_book_file(
    book_id: Optional[str] = Form(default=None),
    book_id_query: Optional[str] = Query(default=None, alias="book_id"),
    deps: dict = Depends(get_book_use_cases)
):
    actual_book_id = book_id or book_id_query
    parse_use_case = deps["parse_use_case"]
    dto: BookResponseDTO = await parse_use_case.execute_parse_file(
        book_id=actual_book_id
    )
    print(f"[DEBUG DTO STATUS] dto.status={dto.parsing_status}", flush=True)
    return success_response(dto)


@router.post("/{book_id}/verify", response_model=dict)
async def verify_and_heal_book(book_id: str, deps: dict = Depends(get_book_use_cases)):
    """触发书籍文件校验与自愈"""
    healing_use_case = deps["healing_use_case"]
    result = await healing_use_case.execute(book_id)
    return success_response(result)



