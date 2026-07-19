// ─── 状态到 Badge 视觉变体的映射字典 ─────────────────────────────────────────────

export type BadgeVariant =
  | "cyan"
  | "amber"
  | "slate"
  | "violet"
  | "emerald"
  | "blue"
  | "red";

export const BADGE_VARIANT_STYLES: Record<BadgeVariant, string> = {
  cyan: "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40",
  amber: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40",
  slate: "bg-slate-500/20 text-slate-300 ring-1 ring-slate-400/30",
  violet: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/40",
  emerald: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40",
  blue: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/40",
  red: "bg-red-500/15 text-red-300 ring-1 ring-red-500/40",
};

export const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  ACTIVE: "cyan",
  SUSPENDED: "amber",
  ARCHIVED: "slate",
  PARSING: "violet",
  COMPLETED: "emerald",
  RUNNING: "blue",
  BLOCKED: "red",
  PENDING: "slate",
};

export const STATUS_LABEL_MAP: Record<string, string> = {
  ACTIVE: "进行中",
  SUSPENDED: "休眠",
  ARCHIVED: "只读归档",
  PARSING: "解析中",
  COMPLETED: "已完成",
  RUNNING: "执行中",
  BLOCKED: "已阻塞",
  PENDING: "等待中",
};

// ─── 通用任务看板列配置 ───────────────────────────────────────────────────────

export interface TaskColumnConfig {
  id: string;
  label: string;
  color: string;
}

export const TASK_COLUMNS: TaskColumnConfig[] = [
  { id: "BLOCKED", label: "已阻塞", color: "bg-red-400" },
  { id: "RUNNING", label: "执行中", color: "bg-blue-400" },
  { id: "COMPLETED", label: "已完成", color: "bg-emerald-400" },
];
