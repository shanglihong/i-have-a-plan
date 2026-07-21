"""
接入层 - 任务路由 (占位)

覆盖 API 规范 2.5：计划与任务调度
  - POST  /api/tasks/reschedule  拓扑顺延计算（半自动重调度）
  - PATCH /api/tasks/{id}        更新原子任务状态

TODO: 待应用层 TaskUseCases + domain_service.propagate_deadline_delay 实现后补全。
"""
from fastapi import APIRouter

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/reschedule")
async def reschedule_tasks() -> dict:
    return {"message": "not implemented"}


@router.patch("/{task_id}")
async def update_task(task_id: str) -> dict:
    return {"message": "not implemented", "task_id": task_id}
