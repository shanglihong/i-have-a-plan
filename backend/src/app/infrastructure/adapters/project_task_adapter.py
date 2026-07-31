"""Project/Task 领域任务树挂载适配器实现

实现 Agent 领域的 ProjectTaskPort 接口，封装具体领域对象转换与 TaskOperationDomainService 逻辑。
"""

import logging
from typing import List

from app.domain.agent.tools.tool_ports import ProjectTaskPort, TaskChainInput
from app.domain.project.entities import TaskChain, Task, TaskChainType, TaskStatus
from app.domain.project.services.task_operation_service import TaskOperationDomainService
from app.utils.snow import id_worker

logger = logging.getLogger(__name__)


class TaskOperationProjectTaskAdapter(ProjectTaskPort):
    """基于 TaskOperationDomainService 的 ProjectTaskPort 端口适配器"""

    def __init__(self, task_op_service: TaskOperationDomainService):
        self.task_op_service = task_op_service

    async def attach_generated_task_tree(self, project_id: str, task_chains: List[TaskChainInput]) -> bool:
        """解构 TaskChainInput 列表并反序列化为 TaskChain/Task 领域对象，驱动 TaskOperationDomainService 挂载落盘与激活状态"""
        try:
            domain_chains: List[TaskChain] = []

            for c_idx, chain_input in enumerate(task_chains, start=1):
                chain_id = f"chain_{id_worker.next_id_str()}"
                domain_tasks: List[Task] = []

                for t_idx, task_input in enumerate(chain_input.tasks, start=1):
                    task_id = f"task_{id_worker.next_id_str()}"
                    task = Task(
                        id=task_id,
                        task_chain_id=chain_id,
                        title=task_input.title or f"任务-{t_idx}",
                        description=task_input.description,
                        sequence_order=task_input.sequence_order or t_idx,
                        status=TaskStatus.PENDING,
                    )
                    domain_tasks.append(task)

                try:
                    chain_type = TaskChainType(chain_input.type)
                except ValueError:
                    chain_type = TaskChainType.DEFAULT

                chain = TaskChain(
                    id=chain_id,
                    project_id=project_id,
                    title=chain_input.title or f"阶段-{c_idx}",
                    chain_type=chain_type,
                    sequence_order=chain_input.sequence_order or c_idx,
                    tasks=domain_tasks,
                )
                domain_chains.append(chain)

            result = await self.task_op_service.mount_task_tree_and_activate(
                project_id=project_id,
                task_chains=domain_chains,
            )
            return result is not None
        except Exception as e:
            logger.error(f"TaskOperationProjectTaskAdapter 挂载任务树失败: {e}", exc_info=True)
            return False
