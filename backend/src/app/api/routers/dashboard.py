"""
接入层 - 大盘路由 (占位)

覆盖 API 规范 2.6：大盘工作台与汇总统计
  - GET /api/dashboard/stats    工作台指标汇总
  - GET /api/notes/featured     大盘精选金句笔记
  - GET /api/skills/active      活跃技能引擎列表

TODO: 待汇总查询用例实现后补全。
"""
from fastapi import APIRouter

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/stats")
async def get_dashboard_stats() -> dict:
    return {"message": "not implemented"}


@router.get("/notes/featured")
async def get_featured_notes() -> dict:
    return {"message": "not implemented"}


@router.get("/skills/active")
async def get_active_skills() -> dict:
    return {"message": "not implemented"}
