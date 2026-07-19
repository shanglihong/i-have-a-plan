// ─── Project 领域实体类型定义 ──────────────────────────────────────────────────

export type ProjectType = "READING" | "PLAN";

export type ProjectStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "ARCHIVED"
  | "PARSING"
  | "COMPLETED";

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  status: ProjectStatus;
  progress: number;
  deadline: string;
  tags: string[];
  category?: string;
  createdAt?: string;
  notes?: number;
  tasks?: number;
}
