"""冷启动崩溃修复守护调度服务模块 (StartupHealingThread)"""

from typing import List
from app.domain.project.entities import ProjectStatus
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort


class ProjectHealthService:
    """冷启动修复线程/守护调度服务"""

    def __init__(
        self,
        project_repo: ProjectRepositoryPort,
        task_repo: TaskRepositoryPort,
    ):
        self.project_repo = project_repo
        self.task_repo = task_repo


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

        return healed_summary
    #
    # async def heal(self, project: Project) -> Optional[str]:
    #     if not project.task_chains:
    #         # TODO 触发链生成
    #         return f"Project {project.id}: kept INIT for un-dialogue PLAN project"
    #
    #     project.transit_to_active()
    #     await self.project_repo.save(project)
    #     return f"Project {project.id}: healed PLAN project to ACTIVE"
    #
    # async def heal(self, project: Project) -> Optional[str]:
    #     if not project.book_id:
    #         return None
    #
    #     # 模拟读取预解析 JSON 树 TODO
    #     default_toc = [
    #         {"id": "toc_c01", "title": "第一章 软件启动恢复修补", "target_chapter_id": "chap_01"}
    #     ]
    #     project.attach_toc_tree(default_toc, project.book_id)
    #     project.transit_to_active()
    #     await self.project_repo.save(project)
    #     await self.task_repo.save_task_chains(project.id, project.task_chains)
    #     return f"Project {project.id}: healed READING project to ACTIVE"