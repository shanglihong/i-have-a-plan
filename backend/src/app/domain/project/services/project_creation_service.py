"""项目创建领域服务 (Domain Service)"""

from datetime import datetime
from typing import Optional
from app.domain.project.entities import Project
from app.domain.project.factory import ProjectFactory
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort

class ProjectCreationDomainService:
    """项目创建与 Agent 句柄绑定领域服务"""

    def __init__(
        self,
        project_repo: ProjectRepositoryPort,
        task_repo: TaskRepositoryPort,
    ):
        self.project_repo = project_repo
        self.task_repo = task_repo

    async def create_plan_project(
        self,
        title: str,
        deadline: Optional[datetime] = None,
        agent_id: Optional[str] = None,
    ) -> Project:
        # 1. 使用 Factory 构建 INIT 状态项目聚合根
        project = ProjectFactory.build_plan_project(title=title, deadline=deadline)

        # 2. Agent 句柄并绑定
        if agent_id:
            project.bind_agent(agent_id)

        # 3. 持久化到仓储
        await self.project_repo.save(project)
        if project.task_chains:
            await self.task_repo.save_task_chains(project.id, project.task_chains)

        return project

    async def create_reading_project(
        self,
        title: str,
        project_id: Optional[str] = None,
        deadline: Optional[datetime] = None,
        book_id: Optional[str] = None,
        agent_id: Optional[str] = None,
    ) -> Project:
        # 1. 使用 Factory 构建 INIT 状态项目聚合根
        project = ProjectFactory.build_reading_project(
            title=title,
            project_id=project_id,
            deadline=deadline,
            book_id=book_id,
        )

        # 2. Agent 句柄并绑定
        if agent_id:
            project.bind_agent(agent_id)

        # 3. 持久化到仓储
        await self.project_repo.save(project)
        if project.task_chains:
            await self.task_repo.save_task_chains(project.id, project.task_chains)

        return project
