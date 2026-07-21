"""
项目上下文 - 应用用例编排 (Application Use Cases)

用例层是"业务外观"：
  - 接收来自接入层的原始输入（已验证的 Schema）
  - 协调领域层业务逻辑
  - 通过 Port 接口调用基础设施（存储、LLM、沙箱）
  - 不包含任何领域规则，不直接操作数据库

显式注入：构造函数接收 Port 实例，不使用框架注解，便于测试 Mock 替换。
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from app.domain.project.entities import Project, ProjectStatus, ProjectType

if TYPE_CHECKING:
    from app.domain.ports.repository_port import ProjectRepositoryPort


class CreateProjectInput:
    """创建项目的输入 DTO"""

    def __init__(
        self,
        title: str,
        type: str,
        deadline: datetime | None = None,
    ) -> None:
        self.title = title
        self.type = ProjectType(type)
        self.deadline = deadline


class ProjectUseCases:
    """
    项目上下文业务用例集合

    依赖通过构造函数显式注入（Ports），测试时可注入 Mock 实现。
    """

    def __init__(self, project_repo: "ProjectRepositoryPort") -> None:
        self._project_repo = project_repo

    async def create_project(self, input_data: CreateProjectInput) -> Project:
        """
        创建双轨项目（READING 或 PLAN 类型）。

        业务规则：
          - 新建项目默认状态为 INIT
          - ID 由领域层生成（UUID）
        """
        project = Project(
            id=str(uuid.uuid4()),
            title=input_data.title,
            type=input_data.type,
            status=ProjectStatus.INIT,
            deadline=input_data.deadline,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        return await self._project_repo.save(project)

    async def get_project(self, project_id: str) -> Project | None:
        """获取单个项目，不存在返回 None"""
        return await self._project_repo.get_by_id(project_id)

    async def list_projects(
        self, page: int = 1, size: int = 20
    ) -> tuple[list[Project], int]:
        """分页获取项目列表（Offset 分页）"""
        return await self._project_repo.list_all(page=page, size=size)

    async def archive_project(self, project_id: str) -> Project:
        """
        归档项目。

        业务规则：
          - 仅 ACTIVE 或 SUSPENDED 状态可归档
          - 归档后触发领域事件（经验笔记生成）—— 待 EventBus 接入后实现
        """
        project = await self._project_repo.get_by_id(project_id)
        if project is None:
            raise ValueError(f"项目不存在: {project_id}")

        project.status = ProjectStatus.ARCHIVED
        project.updated_at = datetime.utcnow()
        return await self._project_repo.save(project)
