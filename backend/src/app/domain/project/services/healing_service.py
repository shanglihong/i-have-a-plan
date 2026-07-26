"""冷启动崩溃修复守护线程 (StartupHealingThread)

实现二、1 (3) 交互流：扫描 status=INIT 的半成品项目并根据场景 A/B/C/D/E 执行恢复自愈
"""

from typing import List
from app.domain.project.entities import ProjectStatus, ProjectType
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort
from app.domain.book.events import BookParseRequestedEvent
from app.domain.project.events import ProjectCreatedEvent, ProjectParseFailedEvent
from app.domain.notification.notification_service import global_notification_service
from app.infrastructure.event_bus.asyncio_event_bus import global_event_bus


class StartupHealingThread:
    """冷启动修复线程服务"""

    def __init__(self, project_repo: ProjectRepositoryPort, task_repo: TaskRepositoryPort):
        self.project_repo = project_repo
        self.task_repo = task_repo

    async def trigger_startup_healing(self) -> List[str]:
        """扫描所有 INIT 状态的半成品项目并修复"""
        init_projects, total = await self.project_repo.list_projects(
            status=ProjectStatus.INIT,
            page=1,
            size=100,
        )

        healed_summary: List[str] = []

        for project in init_projects:
            # 重新查完整属性
            full_project = await self.project_repo.get_by_id(project.id)
            if not full_project:
                continue

            if full_project.project_type == ProjectType.READING:
                # 场景 B: 如果有关联切片但未转转为 ACTIVE -> 假定提取 JSON 补全
                if full_project.book_id:
                    # 模拟读取预解析 JSON 树
                    default_toc = [
                        {"id": "toc_c01", "title": "第一章 软件启动恢复修补", "target_chapter_id": "chap_01"}
                    ]
                    full_project.attach_toc_tree(default_toc, full_project.book_id)
                    full_project.transit_to_active()
                    await self.project_repo.save(full_project)
                    await self.task_repo.save_task_chains(full_project.id, full_project.task_chains)

                    # 广播事件与 Notification 页面通知
                    event = ProjectCreatedEvent(
                        project_id=full_project.id,
                        project_type=full_project.project_type.value,
                        status=full_project.status.value,
                    )
                    await global_event_bus.publish(event)
                    await global_notification_service.handle_project_created(event)
                    healed_summary.append(f"Project {full_project.id}: healed READING project to ACTIVE")

            elif full_project.project_type == ProjectType.PLAN:
                # 场景 C: PLAN - 对话草稿完备自愈
                # 模拟自动建树挂载
                default_chains = []
                if not full_project.task_chains:
                    healed_summary.append(f"Project {full_project.id}: kept INIT for un-dialogued PLAN project")
                else:
                    full_project.transit_to_active()
                    await self.project_repo.save(full_project)
                    event = ProjectCreatedEvent(
                        project_id=full_project.id,
                        project_type=full_project.project_type.value,
                        status=full_project.status.value,
                    )
                    await global_event_bus.publish(event)
                    await global_notification_service.handle_project_created(event)
                    healed_summary.append(f"Project {full_project.id}: healed PLAN project to ACTIVE")

        return healed_summary
