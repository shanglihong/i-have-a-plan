export type TaskStatus = "PENDING" | "RUNNING" | "COMPLETED" | "BLOCKED";

export interface TaskDO {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  parent_task_id?: string;
  deadline?: string;
  depends_on_task_ids?: string[];
  duration?: string;
}

export interface TaskVO extends TaskDO {
  _ui_is_highlighted?: boolean;
}

export interface RescheduleTaskPayload {
  task_id: string;
  postpone_days: number;
}

export interface UpdateTaskStatusPayload {
  task_id: string;
  status: TaskStatus;
}
