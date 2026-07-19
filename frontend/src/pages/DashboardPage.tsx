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
import { useQuery } from "@tanstack/react-query";
import { api } from "../shared/api";
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

import { StatusBadge, ProgressBar, SuspendedOverlay } from "../shared/ui";


// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<
    "ALL" | "READING" | "PLAN"
  >("ALL");
  const [suspendedStates, setSuspendedStates] = useState<
    Record<string, boolean>
  >({
    "4": true,
  });

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', filter],
    queryFn: async () => {
      const res = await api.get('/projects', { params: { status: filter } });
      return res.data;
    }
  });

  const projects = projectsData?.items || [];
  const recent = projects.slice(0, 4);

  const handleResume = (id: string) => {
    setSuspendedStates((s) => ({ ...s, [id]: false }));
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            知识工作台
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            2026年7月18日 · 星期六
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/graph")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/8 rounded-lg ring-1 ring-white/8 transition-all"
          >
            <Network size={13} />
            知识图谱
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 rounded-lg ring-1 ring-cyan-500/30 transition-all font-medium"
          >
            <Plus size={13} />
            新建项目
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "进行中项目",
            value: "4",
            icon: TrendingUp,
            color: "cyan",
          },
          {
            label: "累计笔记",
            value: "119",
            icon: Bookmark,
            color: "violet",
          },
          {
            label: "已提炼技能",
            value: "8",
            icon: Cpu,
            color: "emerald",
          },
          {
            label: "图谱节点",
            value: "236",
            icon: Network,
            color: "blue",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="glass rounded-xl p-4 flex items-center gap-3"
          >
            <div
              className={`w-9 h-9 rounded-lg bg-${s.color}-500/15 flex items-center justify-center`}
            >
              <s.icon
                size={16}
                className={`text-${s.color}-400`}
              />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-100 leading-none">
                {s.value}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent projects carousel */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-300">
            最近访问
          </h2>
          <button className="text-xs text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1">
            查看全部 <ChevronRight size={12} />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {recent.map((p) => (
            <motion.div
              key={p.id}
              whileHover={{ y: -2 }}
              onClick={() =>
                navigate(
                  p.type === "READING"
                    ? `/project/read/${p.id}`
                    : `/project/plan/${p.id}`,
                )
              }
              className="glass rounded-xl p-4 w-56 shrink-0 cursor-pointer hover:ring-1 hover:ring-white/15 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.type === "READING" ? "bg-cyan-500/15" : "bg-violet-500/15"}`}
                >
                  {p.type === "READING" ? (
                    <BookOpen
                      size={13}
                      className="text-cyan-400"
                    />
                  ) : (
                    <ListChecks
                      size={13}
                      className="text-violet-400"
                    />
                  )}
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm font-medium text-slate-200 leading-snug line-clamp-2 mb-3">
                {p.title}
              </p>
              <ProgressBar
                value={p.progress}
                color={p.type === "READING" ? "cyan" : "violet"}
              />
              <p className="text-[10px] text-slate-600 mt-1.5">
                {p.progress}% 完成
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Project list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-300">
            所有项目
          </h2>
          <div className="flex gap-1">
            {(["ALL", "READING", "PLAN"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all ${filter === f ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30" : "text-slate-600 hover:text-slate-400"}`}
              >
                {f === "ALL"
                  ? "全部"
                  : f === "READING"
                    ? "阅读"
                    : "计划"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {projects.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass rounded-xl p-4 relative overflow-hidden cursor-pointer hover:ring-1 hover:ring-white/12 transition-all group
                ${p.status === "ARCHIVED" ? "opacity-60" : ""}`}
              onClick={() => {
                if (p.status !== "SUSPENDED") {
                  navigate(
                    p.type === "READING"
                      ? `/project/read/${p.id}`
                      : `/project/plan/${p.id}`,
                  );
                }
              }}
            >
              {/* Archived banner */}
              {p.status === "ARCHIVED" && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-600/0 via-slate-500/60 to-slate-600/0" />
              )}
              {p.status === "ARCHIVED" && (
                <div className="absolute inset-x-0 top-0 bg-slate-800/60 text-center py-1 text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Archive size={10} /> 只读归档
                </div>
              )}

              {/* Suspended overlay */}
              {p.status === "SUSPENDED" &&
                suspendedStates[p.id] && (
                  <SuspendedOverlay
                    onResume={() => handleResume(p.id)}
                  />
                )}

              <div
                className={`flex items-start justify-between gap-2 ${p.status === "ARCHIVED" ? "mt-5" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center ${p.type === "READING" ? "bg-cyan-500/15" : "bg-violet-500/15"}`}
                    >
                      {p.type === "READING" ? (
                        <BookOpen
                          size={12}
                          className="text-cyan-400"
                        />
                      ) : (
                        <ListChecks
                          size={12}
                          className="text-violet-400"
                        />
                      )}
                    </div>
                    <StatusBadge status={p.status} />
                    <div className="flex gap-1 ml-auto">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-slate-200 leading-snug">
                    {p.title}
                  </h3>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/8 text-slate-500">
                  <MoreHorizontal size={14} />
                </button>
              </div>

              <div className="mt-3 mb-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                  <span>{p.progress}% 进度</span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {p.deadline}
                  </span>
                </div>
                <ProgressBar
                  value={p.progress}
                  color={
                    p.type === "READING" ? "cyan" : "violet"
                  }
                />
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                {"notes" in p && (
                  <span className="flex items-center gap-1">
                    <Bookmark size={10} /> {p.notes} 笔记
                  </span>
                )}
                {"tasks" in p && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={10} /> {p.tasks} 任务
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-slate-700 group-hover:text-cyan-400 transition-colors">
                  进入 <ArrowRight size={10} />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(10,14,26,0.7)",
            }}
            onClick={() => setCreateOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="glass rounded-2xl p-6 w-[480px] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-slate-100">
                  新建项目
                </h2>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  {
                    type: "READING",
                    icon: BookOpen,
                    label: "阅读项目",
                    desc: "上传 PDF/MD，开始深度精读",
                    color: "cyan",
                  },
                  {
                    type: "PLAN",
                    icon: ListChecks,
                    label: "计划项目",
                    desc: "构建任务依赖树，追踪里程碑",
                    color: "violet",
                  },
                ].map((t) => (
                  <div
                    key={t.type}
                    className={`p-4 rounded-xl ring-1 ring-white/8 hover:ring-${t.color}-500/40 bg-white/3 hover:bg-${t.color}-500/8 cursor-pointer transition-all group`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg bg-${t.color}-500/15 flex items-center justify-center mb-3`}
                    >
                      <t.icon
                        size={18}
                        className={`text-${t.color}-400`}
                      />
                    </div>
                    <p className="text-sm font-medium text-slate-200 mb-1">
                      {t.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">
                    项目名称
                  </label>
                  <input
                    className="w-full bg-white/5 ring-1 ring-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-cyan-500/50 transition-all"
                    placeholder="为这个项目起一个名字…"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">
                    截止日期
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white/5 ring-1 ring-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-cyan-500/50 transition-all"
                    defaultValue="2026-09-30"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 py-2 text-sm text-slate-400 bg-white/5 rounded-lg hover:bg-white/8 transition-all"
                >
                  取消
                </button>
                <button className="flex-1 py-2 text-sm text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 ring-1 ring-cyan-500/40 rounded-lg font-medium transition-all">
                  创建项目
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

