import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  NavLink,
  useNavigate,
  Navigate,
} from "react-router-dom";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  Network,
  Cpu,
  Search,
  Bell,
  Plus,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  Bookmark,
  Zap,
  Archive,
  Play,
  MoreHorizontal,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  FileText,
  MessageSquare,
  Sparkles,
  Target,
  Map,
  Settings,
  TrendingUp,
  Circle,
  Minus,
  ChevronsRight,
  Lock,
  Unlock,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";


import { 
  MOCK_PROJECTS, MOCK_NOTES, MOCK_TASKS, 
  MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES, MOCK_SANDBOX_NODES 
} from "../../shared/mock/data";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../shared/api";

import { StatusBadge, ProgressBar } from "../../shared/ui";
import { SuspendedOverlay } from "../../features";


// ─── Plan Workspace ───────────────────────────────────────────────────────────

export default function PlanWorkspacePage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "gantt">(
    "kanban",
  );
  
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}/tasks`);
      return res.data;
    }
  });
  
  const tasks = tasksData || [];
  const [rescheduleTask, setRescheduleTask] = useState<
    string | null
  >(null);
  const [postponeDays, setPostponeDays] = useState(3);
  const [skillSearch, setSkillSearch] = useState("");
  const [compilingSkill, setCompilingSkill] = useState(false);
  const [compileComplete, setCompileComplete] = useState(false);

  const rescheduleMutation = useMutation({
    mutationFn: async (payload: { taskId: string; postponeDays: number }) => {
      const res = await api.post('/tasks/reschedule', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', id] });
      setRescheduleTask(null);
    }
  });

  const handleReschedule = (taskId: string) => {
    rescheduleMutation.mutate({ taskId, postponeDays });
  };

  const handleCompile = () => {
    setCompilingSkill(true);
    setTimeout(() => {
      setCompilingSkill(false);
      setCompileComplete(true);
    }, 3000);
  };

  const columns = [
    { id: "BLOCKED", label: "已阻塞", color: "red" },
    { id: "RUNNING", label: "执行中", color: "blue" },
    { id: "COMPLETED", label: "已完成", color: "emerald" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">
            Q3 产品发布计划
          </h2>
          <p className="text-xs text-slate-600">
            截止 2026-09-30 · 18 个任务
          </p>
        </div>
        <div className="flex-1" />

        {/* Compile notification */}
        <AnimatePresence>
          {compilingSkill && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 glass px-3 py-1.5 rounded-lg text-xs text-slate-400"
            >
              <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1,
                      delay: i * 0.2,
                      repeat: Infinity,
                    }}
                  />
                ))}
              </div>
              后台编译中…
            </motion.div>
          )}
          {compileComplete && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-emerald-500/15 ring-1 ring-emerald-500/30 px-3 py-1.5 rounded-lg text-xs text-emerald-300 cursor-pointer hover:bg-emerald-500/25 transition-all"
              onClick={() => setCompileComplete(false)}
            >
              <CheckCircle2 size={13} />
              新技能编译完成，点击前往审批 →
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skill inject */}
        <div className="flex items-center gap-1.5 bg-white/5 ring-1 ring-white/8 rounded-lg px-2.5 py-1.5">
          <Zap size={12} className="text-amber-400" />
          <input
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            placeholder="注入技能模板…"
            className="bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none w-32"
          />
        </div>

        <div className="flex gap-1 bg-white/5 ring-1 ring-white/8 rounded-lg p-0.5">
          {(["kanban", "gantt"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${view === v ? "bg-white/10 text-slate-200" : "text-slate-600 hover:text-slate-400"}`}
            >
              {v === "kanban" ? "看板" : "甘特"}
            </button>
          ))}
        </div>

        <button
          onClick={handleCompile}
          disabled={compilingSkill}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-violet-300 bg-violet-500/15 hover:bg-violet-500/25 ring-1 ring-violet-500/30 rounded-lg transition-all disabled:opacity-50"
        >
          <Cpu size={12} /> 萃取技能
        </button>
      </div>

      {/* Kanban view */}
      {view === "kanban" && (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 min-w-max h-full">
            {columns.map((col) => (
              <div
                key={col.id}
                className="w-72 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full bg-${col.color}-400`}
                  />
                  <span className="text-xs font-medium text-slate-400">
                    {col.label}
                  </span>
                  <span className="text-[10px] text-slate-700 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                    {
                      tasks.filter((t) => t.status === col.id)
                        .length
                    }
                  </span>
                </div>

                <div className="space-y-2">
                  {tasks
                    .filter((t) => t.status === col.id)
                    .map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        className={`glass rounded-xl p-3 relative
                        ${task.status === "BLOCKED" ? "ring-1 ring-red-500/40" : ""}
                        ${task.status === "COMPLETED" ? "opacity-70" : ""}`}
                      >
                        {task.status === "BLOCKED" && (
                          <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-red-500/40 cycle-error-glow" />
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-xs font-medium leading-snug ${task.status === "BLOCKED" ? "text-red-300" : "text-slate-200"}`}
                          >
                            {task.title}
                          </p>
                          {task.status === "BLOCKED" && (
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setRescheduleTask(task.id)
                                }
                                className="text-[10px] text-red-300 bg-red-500/15 hover:bg-red-500/25 px-2 py-1 rounded-md ring-1 ring-red-500/30 transition-all flex items-center gap-1 whitespace-nowrap"
                              >
                                <RefreshCw size={9} /> 重调度
                              </button>
                              <AnimatePresence>
                                {rescheduleTask === task.id && (
                                  <motion.div
                                    initial={{
                                      opacity: 0,
                                      scale: 0.9,
                                      y: -4,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      scale: 1,
                                      y: 0,
                                    }}
                                    exit={{
                                      opacity: 0,
                                      scale: 0.9,
                                    }}
                                    className="absolute right-0 top-8 z-20 glass rounded-xl p-3 w-52 shadow-2xl"
                                    onClick={(e) =>
                                      e.stopPropagation()
                                    }
                                  >
                                    <p className="text-xs text-slate-400 mb-2">
                                      顺延天数
                                    </p>
                                    <input
                                      type="number"
                                      value={postponeDays}
                                      onChange={(e) =>
                                        setPostponeDays(
                                          Number(
                                            e.target.value,
                                          ),
                                        )
                                      }
                                      min={1}
                                      max={30}
                                      className="w-full bg-white/5 ring-1 ring-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none mb-2 font-mono"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          setRescheduleTask(
                                            null,
                                          )
                                        }
                                        className="flex-1 py-1 text-xs text-slate-500 bg-white/5 rounded-lg"
                                      >
                                        取消
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleReschedule(
                                            task.id,
                                          )
                                        }
                                        className="flex-1 py-1 text-xs text-cyan-300 bg-cyan-500/20 rounded-lg ring-1 ring-cyan-500/40"
                                      >
                                        确认
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <StatusBadge status={task.status} />
                          <span
                            className={`text-[10px] font-mono flex items-center gap-0.5 ${task.status === "BLOCKED" ? "text-red-400 animate-breathe" : "text-slate-600"}`}
                          >
                            <Clock size={9} /> {task.deadline}
                          </span>
                        </div>

                        {task.deps.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <GitBranch
                              size={9}
                              className="text-slate-700"
                            />
                            <span className="text-[10px] text-slate-700">
                              依赖 {task.deps.length} 个前置
                            </span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gantt view */}
      {view === "gantt" && (
        <div className="flex-1 overflow-auto p-4">
          <div className="min-w-[700px]">
            <div className="flex items-center gap-4 mb-3">
              {[
                "7/10",
                "7/15",
                "7/20",
                "7/25",
                "7/30",
                "8/5",
              ].map((d) => (
                <span
                  key={d}
                  className="text-[10px] text-slate-600 font-mono w-24 text-center shrink-0"
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {tasks.map((task) => {
                const start =
                  parseInt(task.deadline.split("-")[2]) - 3;
                const width = 3 + task.level * 2;
                const offset = start - 8;
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3"
                  >
                    <span className="text-xs text-slate-400 w-40 shrink-0 truncate">
                      {task.title}
                    </span>
                    <div className="flex-1 relative h-7">
                      <div className="absolute inset-y-1 left-0 right-0 border-b border-white/5" />
                      <motion.div
                        className={`absolute top-1 h-5 rounded-md flex items-center px-2
                          ${
                            task.status === "COMPLETED"
                              ? "bg-emerald-500/30 ring-1 ring-emerald-500/40"
                              : task.status === "RUNNING"
                                ? "bg-blue-500/30 ring-1 ring-blue-500/40"
                                : task.status === "BLOCKED"
                                  ? "bg-red-500/30 ring-1 ring-red-500/40"
                                  : "bg-slate-700/40 ring-1 ring-white/8"
                          }`}
                        style={{
                          left: `${Math.max(0, offset) * 48}px`,
                          width: `${width * 48}px`,
                        }}
                        initial={{ scaleX: 0, originX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{
                          duration: 0.5,
                          delay: 0.05,
                        }}
                      >
                        <span className="text-[10px] text-slate-300 truncate">
                          {task.title}
                        </span>
                      </motion.div>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

