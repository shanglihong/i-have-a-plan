"""TaskRepository 实现模块 (专注 task_chains 与 tasks 表数据存储)"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, delete

from app.domain.project.entities import TaskChain, Task, TaskChainType, TaskStatus
from app.domain.project.ports import TaskRepositoryPort
from app.infrastructure.db.models.project import TaskChainDO, TaskDO


class TaskRepository(TaskRepositoryPort):
    """基于 AsyncSession 的 SQLite 任务仓储实现"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_task_chains(self, project_id: str, task_chains: List[TaskChain]) -> None:
        for chain in task_chains:
            chain_do = await self.session.get(TaskChainDO, chain.id)
            if not chain_do:
                chain_do = TaskChainDO(
                    id=chain.id,
                    project_id=project_id,
                    title=chain.title,
                    chain_type=chain.chain_type.value,
                    sequence_order=chain.sequence_order,
                    status=chain.status.value,
                    book_id=chain.book_id,
                    chapter_id=chain.chapter_id,
                    created_at=chain.created_at,
                    updated_at=chain.updated_at,
                )
                self.session.add(chain_do)
            else:
                chain_do.title = chain.title
                chain_do.chain_type = chain.chain_type.value
                chain_do.sequence_order = chain.sequence_order
                chain_do.status = chain.status.value
                chain_do.book_id = chain.book_id
                chain_do.chapter_id = chain.chapter_id
                chain_do.updated_at = chain.updated_at

            for task in chain.tasks:
                task_do = await self.session.get(TaskDO, task.id)
                if not task_do:
                    task_do = TaskDO(
                        id=task.id,
                        task_chain_id=chain.id,
                        title=task.title,
                        description=task.description,
                        sequence_order=task.sequence_order,
                        status=task.status.value,
                        parent_task_id=task.parent_task_id,
                        depends_on_task_ids=task.depends_on_task_ids,
                        created_at=task.created_at,
                        updated_at=task.updated_at,
                    )
                    self.session.add(task_do)
                else:
                    task_do.title = task.title
                    task_do.description = task.description
                    task_do.sequence_order = task.sequence_order
                    task_do.status = task.status.value
                    task_do.parent_task_id = task.parent_task_id
                    task_do.depends_on_task_ids = task.depends_on_task_ids
                    task_do.updated_at = task.updated_at

        await self.session.commit()

    async def get_task_chains_by_project_id(self, project_id: str) -> List[TaskChain]:
        chain_stmt = (
            select(TaskChainDO)
            .where(TaskChainDO.project_id == project_id)
            .order_by(TaskChainDO.sequence_order.asc())
        )
        chain_res = await self.session.execute(chain_stmt)
        chain_dos = chain_res.scalars().all()

        task_chains: List[TaskChain] = []
        for cdo in chain_dos:
            task_stmt = (
                select(TaskDO)
                .where(TaskDO.task_chain_id == cdo.id)
                .order_by(TaskDO.sequence_order.asc())
            )
            task_res = await self.session.execute(task_stmt)
            task_dos = task_res.scalars().all()

            tasks = [
                Task(
                    id=tdo.id,
                    task_chain_id=tdo.task_chain_id,
                    title=tdo.title,
                    description=tdo.description,
                    sequence_order=tdo.sequence_order,
                    status=TaskStatus(tdo.status),
                    parent_task_id=tdo.parent_task_id,
                    depends_on_task_ids=list(tdo.depends_on_task_ids or []),
                    created_at=tdo.created_at,
                    updated_at=tdo.updated_at,
                )
                for tdo in task_dos
            ]

            task_chains.append(
                TaskChain(
                    id=cdo.id,
                    project_id=cdo.project_id,
                    title=cdo.title,
                    chain_type=TaskChainType(cdo.chain_type),
                    sequence_order=cdo.sequence_order,
                    status=TaskStatus(cdo.status),
                    book_id=cdo.book_id,
                    chapter_id=cdo.chapter_id,
                    tasks=tasks,
                    created_at=cdo.created_at,
                    updated_at=cdo.updated_at,
                )
            )

        return task_chains

    async def update_task_status(self, task_id: str, status: TaskStatus) -> Optional[Task]:
        task_do = await self.session.get(TaskDO, task_id)
        if not task_do:
            return None

        task_do.status = status.value
        await self.session.commit()

        return Task(
            id=task_do.id,
            task_chain_id=task_do.task_chain_id,
            title=task_do.title,
            description=task_do.description,
            sequence_order=task_do.sequence_order,
            status=TaskStatus(task_do.status),
            parent_task_id=task_do.parent_task_id,
            depends_on_task_ids=list(task_do.depends_on_task_ids or []),
            created_at=task_do.created_at,
            updated_at=task_do.updated_at,
        )

    async def get_task_by_id(self, task_id: str) -> Optional[Task]:
        task_do = await self.session.get(TaskDO, task_id)
        if not task_do:
            return None

        return Task(
            id=task_do.id,
            task_chain_id=task_do.task_chain_id,
            title=task_do.title,
            description=task_do.description,
            sequence_order=task_do.sequence_order,
            status=TaskStatus(task_do.status),
            parent_task_id=task_do.parent_task_id,
            depends_on_task_ids=list(task_do.depends_on_task_ids or []),
            created_at=task_do.created_at,
            updated_at=task_do.updated_at,
        )

    async def delete_by_project_id(self, project_id: str) -> bool:
        chain_stmt = select(TaskChainDO.id).where(TaskChainDO.project_id == project_id)
        chain_res = await self.session.execute(chain_stmt)
        chain_ids = chain_res.scalars().all()

        if chain_ids:
            task_delete_stmt = delete(TaskDO).where(TaskDO.task_chain_id.in_(chain_ids))
            await self.session.execute(task_delete_stmt)

        chain_delete_stmt = delete(TaskChainDO).where(TaskChainDO.project_id == project_id)
        await self.session.execute(chain_delete_stmt)

        await self.session.commit()
        return True
