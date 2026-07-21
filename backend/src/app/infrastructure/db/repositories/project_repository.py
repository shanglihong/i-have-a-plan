"""
基础设施层 - 项目仓储实现

实现 domain/ports/repository_port.py 中定义的 ProjectRepositoryPort 接口。
本文件是"被动适配器"：仅作为技术支撑，不包含任何业务规则。
"""
from __future__ import annotations

import json
from typing import TYPE_CHECKING

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domain.ports.repository_port import ProjectRepositoryPort
from app.domain.project.entities import Project

if TYPE_CHECKING:
    pass


class SqliteProjectRepository(ProjectRepositoryPort):
    """基于 SQLite / SQLModel 的项目仓储实现"""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, project_id: str) -> Project | None:
        return await self._session.get(Project, project_id)

    async def list_all(
        self, page: int = 1, size: int = 20
    ) -> tuple[list[Project], int]:
        offset = (page - 1) * size

        # 查询总数
        count_result = await self._session.exec(
            select(Project)
        )
        all_items = count_result.all()
        total = len(all_items)

        # 分页查询
        result = await self._session.exec(
            select(Project).offset(offset).limit(size)
        )
        items = list(result.all())
        return items, total

    async def save(self, project: Project) -> Project:
        self._session.add(project)
        await self._session.commit()
        await self._session.refresh(project)
        return project

    async def delete(self, project_id: str) -> None:
        project = await self.get_by_id(project_id)
        if project is not None:
            await self._session.delete(project)
            await self._session.commit()
