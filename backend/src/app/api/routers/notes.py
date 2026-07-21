"""
接入层 - 笔记路由 (占位)

覆盖 API 规范 2.3：伴读对话与融合笔记
  - POST /api/notes              创建融合笔记
  - GET  /api/projects/{id}/notes 获取笔记列表（Cursor 分页）
  - POST /api/discuss            伴读对话 SSE

TODO: 待应用层 NoteUseCases 实现后补全。
"""
from fastapi import APIRouter

router = APIRouter(tags=["notes"])


@router.post("/notes")
async def create_note() -> dict:
    return {"message": "not implemented"}


@router.get("/projects/{project_id}/notes")
async def list_notes(project_id: str) -> dict:
    return {"message": "not implemented", "project_id": project_id}


@router.post("/discuss")
async def discuss() -> dict:
    return {"message": "not implemented - SSE endpoint"}
