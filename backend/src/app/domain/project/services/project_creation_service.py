"""项目创建领域服务 (Domain Service)"""

from datetime import datetime
from typing import Optional
from app.domain.project.entities import Project
from app.domain.project.factory import ProjectFactory
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort
from app.domain.agent.ports import AgentDomainPort


class ProjectCreationDomainService:
    """项目创建与 Agent 句柄绑定领域服务"""

    def __init__(
        self,
        project_repo: ProjectRepositoryPort,
        task_repo: TaskRepositoryPort,
        agent_port: AgentDomainPort,
    ):
        self.project_repo = project_repo
        self.task_repo = task_repo
        self.agent_port = agent_port

    async def create_plan_project(
        self,
        title: str,
        deadline: Optional[datetime] = None,
        skill_id: Optional[str] = None,
    ) -> Project:
        # 1. 使用 Factory 构建 INIT 状态项目聚合根
        project = ProjectFactory.build_plan_project(title=title, deadline=deadline)

        # 2. 调用 Agent 领域防腐接口组装监督 Agent 句柄并绑定
        agent_id = await self.agent_port.assemble_and_bind_agent(
            project_id=project.id,
            skill_id=skill_id,
        )
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
    ) -> Project:
        # 1. 使用 Factory 构建 INIT 状态项目聚合根
        project = ProjectFactory.build_reading_project(
            title=title,
            project_id=project_id,
            deadline=deadline,
            book_id=book_id,
        )

        # 2. 调用 Agent 领域防腐接口组装伴读 Agent 句柄并绑定
        agent_id = await self.agent_port.assemble_and_bind_companion_agent(
            project_id=project.id,
        )
        project.bind_agent(agent_id)

        # 3. 持久化到仓储
        await self.project_repo.save(project)
        if project.task_chains:
            await self.task_repo.save_task_chains(project.id, project.task_chains)

        return project
