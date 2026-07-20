export type ProjectType = "READING" | "PLAN";

export type ProjectStatus = "INIT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED" | "PARSING" | "COMPLETED";

// 持久化 DO & API 返回的基础实体
export interface ProjectDO {
  id: string;
  title: string;
  type: ProjectType;
  status: ProjectStatus;
  deadline: string;
  tags: string[];
  assigned_agent_id?: string;
  notes?: number;
  tasks?: number;
  progress: number;
  createdAt?: string;
  updatedAt?: string;
}



// 前端使用 View Object (VO)
export interface ProjectVO extends ProjectDO {
  _ui_progress: number;
  _ui_is_reloading?: boolean;
}

export interface CreateReadingProjectPayload {
  title: string;
  type: "READING";
  deadline: string;
  file?: File;
}

export interface CreatePlanProjectPayload {
  title: string;
  type: "PLAN";
  deadline: string;
  skill_id?: string;
}

export type CreateProjectPayload =
  | CreateReadingProjectPayload
  | CreatePlanProjectPayload;
