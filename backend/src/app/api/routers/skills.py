"""
接入层 - 技能路由 (占位)

覆盖 API 规范 2.4：技能提炼与沙箱验证
  - GET  /api/skills/search      语义检索技能
  - POST /api/skills/compile     提炼编译 SSE
  - POST /api/skills/{id}/approve PA-03 门禁校验（DAG 环路检测）

TODO: 待应用层 SkillUseCases 实现后补全。
"""
from fastapi import APIRouter

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("/search")
async def search_skills() -> dict:
    return {"message": "not implemented"}


@router.post("/compile")
async def compile_skill() -> dict:
    return {"message": "not implemented - SSE endpoint"}


@router.post("/{skill_id}/approve")
async def approve_skill(skill_id: str) -> dict:
    return {"message": "not implemented", "skill_id": skill_id}
