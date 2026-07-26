"""冷启动崩溃修复守护调度服务模块 (StartupHealingThread)"""

from typing import Dict, List, Optional
from app.domain.project.entities import ProjectStatus, ProjectType
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort
from .base import BaseProjectHealer
from .reading_healer import ReadingProjectHealer
from .plan_healer import PlanProjectHealer


class StartupHealingThread:
    """冷启动修复线程/守护调度服务"""

    def __init__(
        self,
        project_repo: ProjectRepositoryPort,
        task_repo: TaskRepositoryPort,
        healers: Optional[List[BaseProjectHealer]] = None,
    ):
        self.project_repo = project_repo
        self.task_repo = task_repo

        if healers is None:
            healers = [
                ReadingProjectHealer(project_repo, task_repo),
                PlanProjectHealer(project_repo, task_repo),
            ]

        self._healers: Dict[ProjectType, BaseProjectHealer] = {
            healer.target_type: healer for healer in healers
        }

    def register_healer(self, healer: BaseProjectHealer) -> None:
        """动态注册/覆盖自定义 Healer"""
        self._healers[healer.target_type] = healer

    async def trigger_startup_healing(self) -> List[str]:
        """扫描所有 INIT 状态的半成品项目并根据项目类型调度 Healer 执行自愈"""
        init_projects, total = await self.project_repo.list_projects(
            status=ProjectStatus.INIT,
            page=1,
            size=100,
        )

        healed_summary: List[str] = []

        for project in init_projects:
            full_project = await self.project_repo.get_by_id(project.id)
            if not full_project:
                continue

            healer = self._healers.get(full_project.project_type)
            if healer:
                summary = await healer.heal(full_project)
                if summary:
                    healed_summary.append(summary)

        return healed_summary
