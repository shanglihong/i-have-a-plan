"""Task 状态变更与进度状态推导领域服务 (Domain Service)"""

from typing import List, Tuple, Optional
from itertools import chain
from app.domain.project.entities import Task, TaskChain, TaskStatus, TaskChainType, ProjectStatus, Project
from app.domain.project.ports import ProjectRepositoryPort, TaskRepositoryPort
from app.domain.project.exceptions import (
    TaskNotFoundException,
    InvalidTaskStateTransitionException,
    CyclicDependencyException,
)

from app.domain.events import EventPublisherPort
from app.domain.project.events import (
    TaskUnlockedEvent,
    TaskStatusChangedEvent,
    TaskDeleteEvent,
)


class TaskStateDomainService:
    """任务状态更新与项目进度校准领域服务"""
    def __init__(
        self,
        project_repo: ProjectRepositoryPort,
        task_repo: TaskRepositoryPort,
        event_publisher: EventPublisherPort
    ):
        self.project_repo = project_repo
        self.task_repo = task_repo
        self.event_publisher = event_publisher


    async def create_chain(
        self,
        project_id: str,
        title: str,
        chain_type: TaskChainType,
        sequence_order: int
    ) -> TaskChain:
        """
        在指定项目下创建中观任务链
        """
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise KeyError(f"未找到关联的项目: {project_id}")

        chain = TaskChain(
            project_id=project_id,
            title=title,
            chain_type=chain_type,
            sequence_order=sequence_order,
            status=TaskStatus.PENDING,
            progress=0.0
        )

        await self.task_repo.save_task_chain(chain)
        return chain


    async def create_task(
        self,
        task_chain_id: str,
        title: str,
        description: str,
        sequence_order: int,
        parent_task_id: Optional[str],
        depends_on_task_ids: List[str]
    ) -> Task:
        """
        创建原子任务并验证依赖无环，支持级联初始状态判定
        """
        project = await self._get_project_by_chain_id(chain_id=task_chain_id)
        new_task = Task(
            task_chain_id=task_chain_id,
            title=title,
            description=description,
            sequence_order=sequence_order,
            parent_task_id=parent_task_id,
            depends_on_task_ids=depends_on_task_ids,
            attached_note_ids=[],
        )

        try:
            project.add_task(new_task)
        except ValueError as e:
            msg = str(e)
            if "前置依赖任务" in msg:
                dep_id = msg.split(":")[-1].strip()
                raise TaskNotFoundException(f"未找到前置依赖任务: {dep_id}")
            elif "任务链" in msg:
                raise TaskNotFoundException(f"未找到归属的任务链: {task_chain_id}")
            else:
                raise

        if not project.validate_acyclic():
            raise CyclicDependencyException("检测到任务依赖关系中存在环路循环依赖！")

        # 落盘保存
        await self.task_repo.save_task(new_task)

        return new_task

    async def delete_chains(self, project_id: str) -> None:
        task_chains = await self.task_repo.get_task_chains_by_project_id(project_id)
        task_chain_ids = [c.id for c in task_chains]
        task_ids = [
            task.id for task in chain.from_iterable(c.tasks for c in task_chains)
        ]
        await self.task_repo.delete_by_project_id(project_id)
        await self.event_publisher.publish(TaskDeleteEvent(task_ids=task_ids, task_chain_ids=task_chain_ids))

    async def update_task_status(
        self,
        task_id: str,
        target_status: TaskStatus
    ) -> Tuple[Project, List[Task], List[Task]]:
        """
        任务状态转移
        返回 (当前项目, 解锁下游列表, 锁定下游列表)
        """
        project = await self._get_project_by_task_id(task_id=task_id)
        task = project.get_task(task_id)
        if not task:
            raise TaskNotFoundException(task_id)

        if project.status == ProjectStatus.ARCHIVED:
            raise InvalidTaskStateTransitionException(
                current_status=task.status,
                target_status=target_status,
                detail="无法修改已归档项目的任务状态，项目为只读状态"
            )

        # 状态未改变
        if task.status == target_status:
            return project, [], []

        # 调用聚合根进行状态扭转与级联解算
        success, unlocked_tasks, locked_tasks = project.transit_task_status(task_id, target_status)
        if not success:
            raise InvalidTaskStateTransitionException(target_status, task.status)

        # 持久化落盘 (批量保存项目所有的任务链及任务，于单一原子事务中提交)
        await self.task_repo.save_task_chains(project.id, project.task_chains)

        # 5. 发布领域事件
        await self.event_publisher.publish(TaskStatusChangedEvent(task_id=task_id, status=target_status))
        await self.event_publisher.publish(TaskUnlockedEvent(unlocked_task_ids=[u.id for u in unlocked_tasks]))

        return project, unlocked_tasks, locked_tasks


    async def recalculate_chain_progress(self, chain_id: str) -> Tuple[Project, TaskChain]:
        """
        手动刷新校准特定链和聚合项目的进度与状态
        """
        project = await self._get_project_by_chain_id(chain_id=chain_id)
        chain = project.get_task_chain(chain_id)
        if not chain:
            raise TaskNotFoundException(chain_id)
        chain.recalculate_progress_and_status()
        await self.task_repo.save_task_chain(chain)
        return project, chain

    async def _get_project_by_task_id(self, task_id: str) -> Project:
        task = await self.task_repo.find_task_by_id(task_id)
        if not task:
            raise TaskNotFoundException(task_id)
        return await self._get_project_by_chain_id(task.task_chain_id or "")

    async def _get_project_by_chain_id(self, chain_id: str) -> Project:
        target_chain = await self.task_repo.find_task_chain_by_id(chain_id)
        if not target_chain:
            raise TaskNotFoundException(f"任务归属的任务链不存在: {chain_id}")

        project_id = target_chain.project_id or ""
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise KeyError(f"任务关联的项目不存在: {project_id}")

        all_chains = await self.task_repo.get_task_chains_by_project_id(project_id)
        project.task_chains = all_chains
        return project
