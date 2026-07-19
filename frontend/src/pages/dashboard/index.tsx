import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api";
import {
  BookOpen,
  ListChecks,
  Network,
  Cpu,
  Plus,
  X,
  Bookmark,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Zap,
  ChevronRight,
  Quote,
} from "lucide-react";

import {
  StatusBadge,
  ProgressBar,
  DarkDatePicker,
  FileDropzone,
} from "../../shared/ui";
import { COLOR_MAP, ThemeColorKey } from "../../shared/constants";
import { Project, ProjectType } from "../../shared/types";
import { SuspendedOverlay } from "../../features";
import { MOCK_PROJECTS, MOCK_NOTES } from "../../shared/mock/data";

// ─── 预设技能模板列表 ────────────────────────────────────────────────────────

interface SkillOption {
  id: string;
  title: string;
  category: string;
  nodesCount: number;
}

const PRESET_SKILLS: SkillOption[] = [
  { id: "skill_01", title: "Linux 内核模块分析与调试", category: "系统底层", nodesCount: 14 },
  { id: "skill_02", title: "Graph RAG 知识检索系统架构", category: "AI 与图工程", nodesCount: 9 },
  { id: "skill_03", title: "TypeScript & React 高级模式", category: "前端体系", nodesCount: 12 },
];

// ─── 统计指标卡片元数据 ───────────────────────────────────────────────────────

interface StatItem {
  label: string;
  value: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: ThemeColorKey;
}

const STAT_ITEMS: StatItem[] = [
  {
    label: "进行中项目",
    value: "4",
    desc: "本周预计完成 2 个里程碑",
    icon: TrendingUp,
    color: "cyan",
  },
  {
    label: "累计笔记",
    value: "119",
    desc: "本周提炼新增 12 篇精读笔记",
    icon: Bookmark,
    color: "violet",
  },
  {
    label: "已提炼技能",
    value: "8",
    desc: "已关联 5 个核心领域知识节点",
    icon: Cpu,
    color: "emerald",
  },
  {
    label: "图谱节点",
    value: "236",
    desc: "1 个依赖节点需要关注处理",
    icon: Network,
    color: "blue",
  },
];

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 模态框与表单 State
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<ProjectType>("READING");
  const [projectTitle, setProjectTitle] = useState("");
  const [deadline, setDeadline] = useState("2026-09-30");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const [suspendedStates, setSuspendedStates] = useState<Record<string, boolean>>({
    "4": true,
  });

  // 项目列表 Query
  const { data: projectsData } = useQuery<{ items: Project[]; total: number }>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get("/projects");
      return res.data;
    },
  });

  const projects: Project[] = projectsData?.items || MOCK_PROJECTS;

  // 最近访问项目 (前 4 个)
  const recentProjects: Project[] = projects.slice(0, 4);

  // 重点关注项目 (如被暂停、处于关键进度或逾期的项目)
  const focusProjects = projects.filter(
    (p) => p.status === "SUSPENDED" || p.status === "ACTIVE" || p.progress > 60
  ).slice(0, 3);

  // 创建项目 Mutation
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (createType === "READING") {
        const formData = new FormData();
        formData.append("title", projectTitle.trim());
        formData.append("type", "READING");
        formData.append("deadline", new Date(deadline).toISOString());
        if (selectedFile) {
          formData.append("file", selectedFile);
        }
        const res = await api.post("/projects", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
      } else {
        const payload = {
          title: projectTitle.trim(),
          type: "PLAN",
          deadline: new Date(deadline).toISOString(),
          skill_id: selectedSkillId || undefined,
        };
        const res = await api.post("/projects", payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      resetForm();
      setCreateOpen(false);
    },
    onError: (err: any) => {
      const detail =
        err?.response?.data?.detail || "创建项目失败，请检查输入或接口依赖";
      setFormError(detail);
    },
  });

  const resetForm = () => {
    setProjectTitle("");
    setDeadline("2026-09-30");
    setSelectedFile(null);
    setSelectedSkillId("");
    setFormError(null);
  };

  const handleResume = (id: string) => {
    setSuspendedStates((s) => ({ ...s, [id]: false }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!projectTitle.trim()) {
      setFormError("请输入项目名称");
      return;
    }

    if (createType === "READING" && !selectedFile) {
      setFormError("阅读项目必须上传关联的 PDF / MD / TXT 文档");
      return;
    }

    createProjectMutation.mutate();
  };

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setFormError(null);
      if (!projectTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setProjectTitle(nameWithoutExt);
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">知识工作台</h1>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              v1.0 研发双轨
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            感知精读与计划里程碑，驱动沉淀为可复用的技能拓扑
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate("/graph")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 bg-white/5 hover:bg-white/10 rounded-xl ring-1 ring-white/10 transition-all cursor-pointer font-medium"
          >
            <Network size={14} className="text-cyan-400" />
            知识图谱
          </button>
          <button
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-cyan-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 rounded-xl font-semibold shadow-md shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            新建双轨项目
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {STAT_ITEMS.map((s, i) => {
          const colorStyle = COLOR_MAP[s.color];
          const IconComp = s.icon;
          return (
            <div
              key={i}
              className="glass rounded-2xl p-4 flex items-center gap-3.5 border border-white/8 hover:border-white/15 transition-all group"
            >
              <div
                className={`w-10 h-10 rounded-xl ${colorStyle.bg} border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
              >
                <IconComp size={18} className={colorStyle.text} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-100 leading-none font-mono">
                  {s.value}
                </p>
                <p className="text-xs font-semibold text-slate-300 mt-1">{s.label}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2-Column Responsive Dashboard Layout (Main 8 : Sidebar 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Main Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: 最近访问 (Recent Visits Grid) */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-200 tracking-wide">
                  最近访问项目
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                最近更新项目 (4)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {recentProjects.map((p, idx) => {
                const isReading = p.type === "READING";
                const isSuspended = p.status === "SUSPENDED" && suspendedStates[p.id];

                return (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -3 }}
                    onClick={() => {
                      if (!isSuspended) {
                        navigate(
                          isReading
                            ? `/project/read/${p.id}`
                            : `/project/plan/${p.id}`
                        );
                      }
                    }}
                    className={`glass rounded-2xl p-4.5 relative overflow-hidden border transition-all cursor-pointer group shadow-lg ${isReading
                        ? "border-white/10 hover:border-cyan-500/40 hover:shadow-cyan-950/40"
                        : "border-white/10 hover:border-violet-500/40 hover:shadow-violet-950/40"
                      }`}
                  >
                    {/* Top Accent Gradient Bar */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isReading
                          ? "from-cyan-400 to-blue-500"
                          : "from-violet-400 to-purple-600"
                        } opacity-70 group-hover:opacity-100 transition-opacity`}
                    />

                    {/* Suspended Overlay */}
                    {isSuspended && (
                      <SuspendedOverlay onResume={() => handleResume(p.id)} />
                    )}

                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center border ${isReading
                              ? `${COLOR_MAP.cyan.bg} border-cyan-500/20`
                              : `${COLOR_MAP.violet.bg} border-violet-500/20`
                            }`}
                        >
                          {isReading ? (
                            <BookOpen size={14} className={COLOR_MAP.cyan.text} />
                          ) : (
                            <ListChecks size={14} className={COLOR_MAP.violet.text} />
                          )}
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">
                        {idx === 0 ? "10分钟前" : idx === 1 ? "1小时前" : "昨天"}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 leading-snug line-clamp-2 mb-2 group-hover:text-cyan-300 transition-colors">
                      {p.title}
                    </h3>

                    {/* Tag Pills */}
                    <div className="flex items-center gap-1 mb-3 flex-wrap">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-medium"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    {/* Progress Bar & Footer */}
                    <div className="space-y-1.5 pt-1 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span className="font-semibold text-slate-200">
                          {p.progress}% <span className="text-[10px] text-slate-400 font-normal">完成度</span>
                        </span>
                        <span className="text-[10px] flex items-center gap-1 text-slate-400">
                          <Clock size={11} /> {p.deadline}
                        </span>
                      </div>
                      <ProgressBar
                        value={p.progress}
                        color={isReading ? "cyan" : "violet"}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span className="text-[11px]">
                        {p.notes ? `${p.notes} 篇提炼笔记` : `${p.tasks || 0} 个阶段任务`}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-cyan-300 font-medium transition-colors">
                        进入 <ChevronRight size={13} />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Section 2: 重点关注项目 (Projects Needing Focus) */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-200 tracking-wide">
                  重点关注项目
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">
                需处理阻塞、恢复进度或生成技能
              </span>
            </div>

            <div className="space-y-3">
              {focusProjects.map((p) => {
                const isSuspended = p.status === "SUSPENDED";
                const isHighProgress = p.progress >= 65;

                return (
                  <div
                    key={`focus-${p.id}`}
                    className="glass rounded-2xl p-4 border border-white/8 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isSuspended
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : isHighProgress
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                          }`}
                      >
                        {isSuspended ? (
                          <RotateCcw size={16} />
                        ) : isHighProgress ? (
                          <Zap size={16} />
                        ) : (
                          <AlertCircle size={16} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isSuspended
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : isHighProgress
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                  : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                              }`}
                          >
                            {isSuspended
                              ? "处于暂停状态"
                              : isHighProgress
                                ? "阶段里程碑即将达成"
                                : "进行中关键里程碑"}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            截止: {p.deadline}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-200 group-hover:text-slate-100 truncate">
                          {p.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isSuspended
                            ? "当前已被挂起，建议恢复执行以避免任务延期"
                            : isHighProgress
                              ? `进度已达 ${p.progress}%，建议提交提炼生成 Sandbox Skill`
                              : `已完成 ${p.progress}%，当前推进正常`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      <button
                        onClick={() =>
                          navigate(
                            p.type === "READING"
                              ? `/project/read/${p.id}`
                              : `/project/plan/${p.id}`
                          )
                        }
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>立即处理</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: 最新知识提炼洞察 (Latest Knowledge Snippets) */}
          <div className="glass rounded-2xl p-4.5 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <Quote size={16} className="text-violet-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  最新笔记金句提炼
                </h3>
              </div>
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono">
                3 篇精选
              </span>
            </div>

            <div className="space-y-3">
              {MOCK_NOTES.slice(0, 2).map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 hover:border-white/10 transition-colors"
                >
                  <p className="text-xs text-slate-300 italic leading-relaxed">
                    “{note.quote || note.content}”
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-white/5">
                    <span className="text-cyan-400">{note.anchor}</span>
                    <span>{note.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/project/read/1")}
              className="w-full py-2 text-xs font-medium text-slate-300 hover:text-cyan-300 bg-white/5 hover:bg-cyan-500/10 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <span>在《深度学习基础》中查看全部笔记</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Card 2: 技能引擎与图谱 (Skill Engine & Graph Activity) */}
          <div className="glass rounded-2xl p-4.5 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  技能引擎与图谱
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                活跃中
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Graph RAG 知识检索系统架构
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    已关联 9 个节点 · 图谱已部署
                  </p>
                </div>
                <button
                  onClick={() => navigate("/skills/sandbox/skill-1")}
                  className="px-2.5 py-1 text-[11px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25 transition-all cursor-pointer shrink-0"
                >
                  前往沙箱
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Linux 内核模块调试 Skill
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    包含 14 个任务拓扑 · 进行中
                  </p>
                </div>
                <button
                  onClick={() => navigate("/graph")}
                  className="px-2.5 py-1 text-[11px] text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/25 transition-all cursor-pointer shrink-0"
                >
                  查看图谱
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 创建双轨项目模态框 ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-950/75 p-4 overflow-y-auto"
            onClick={() => setCreateOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="glass rounded-2xl p-6 w-full max-w-[520px] shadow-2xl my-8 border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">
                      创建双轨项目
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      支持阅读精读轨（文档上传）与计划执行轨（技能注入）
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* 错误提示条 */}
                {formError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 flex items-start gap-2 text-red-300 text-xs">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 双轨类型切换卡片 */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    {
                      type: "READING" as const,
                      icon: BookOpen,
                      label: "阅读项目 (READING)",
                      desc: "上传 PDF/MD 文档，建立切片阅读与关联笔记",
                      color: "cyan" as const,
                    },
                    {
                      type: "PLAN" as const,
                      icon: ListChecks,
                      label: "计划项目 (PLAN)",
                      desc: "注入技能模板，构建任务依赖拓扑树",
                      color: "violet" as const,
                    },
                  ].map((t) => {
                    const isSelected = createType === t.type;
                    const themeStyle = COLOR_MAP[t.color];
                    const IconComp = t.icon;
                    return (
                      <div
                        key={t.type}
                        onClick={() => {
                          setCreateType(t.type);
                          setFormError(null);
                        }}
                        className={`p-3.5 rounded-xl ring-1 transition-all cursor-pointer group ${isSelected
                            ? `${themeStyle.ring} bg-white/10`
                            : "ring-white/10 hover:ring-white/20 bg-white/5"
                          }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg ${themeStyle.bg} flex items-center justify-center mb-2.5`}
                        >
                          <IconComp size={16} className={themeStyle.text} />
                        </div>
                        <p className="text-xs font-medium text-slate-200 mb-1">
                          {t.label}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {t.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* 公共基础信息域 */}
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="text-xs text-slate-300 mb-1.5 block font-medium">
                      项目名称 <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={projectTitle}
                      onChange={(e) => {
                        setProjectTitle(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder={
                        createType === "READING"
                          ? "如：深入理解 Linux 内核架构"
                          : "如：Graph RAG 引擎落地计划"
                      }
                      className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-colors"
                    />
                  </div>

                  {/* 期望截止日期 */}
                  <div>
                    <label className="text-xs text-slate-300 mb-1.5 block font-medium">
                      期望截止日期
                    </label>
                    <DarkDatePicker
                      value={deadline}
                      onChange={(val) => setDeadline(val)}
                      color={createType === "READING" ? "cyan" : "violet"}
                    />
                  </div>

                  {/* 文件上传 (READING) */}
                  {createType === "READING" && (
                    <div>
                      <label className="text-xs text-slate-300 mb-1.5 block font-medium">
                        实体文档上传 (file) <span className="text-cyan-400">*</span>
                      </label>
                      <FileDropzone
                        selectedFile={selectedFile}
                        onFileSelect={handleFileChange}
                        onFileRemove={() => setSelectedFile(null)}
                      />
                    </div>
                  )}

                  {/* 技能模板注入 (PLAN) */}
                  {createType === "PLAN" && (
                    <div>
                      <label className="text-xs text-slate-300 mb-1.5 block font-medium flex items-center justify-between">
                        <span>可选技能模板注入 (skill_id)</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          可选从零开始或注入标准技能
                        </span>
                      </label>
                      <div className="space-y-2">
                        <div
                          onClick={() => setSelectedSkillId("")}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${selectedSkillId === ""
                              ? "border-violet-500/60 bg-violet-500/15 text-slate-200"
                              : "border-slate-700/80 hover:border-slate-600 bg-slate-900/40 text-slate-400"
                            }`}
                        >
                          <span className="font-medium">无 (从零创建自订任务树)</span>
                          <span className="text-[11px] text-slate-400">零前置模版</span>
                        </div>

                        {PRESET_SKILLS.map((sk) => {
                          const isSel = selectedSkillId === sk.id;
                          return (
                            <div
                              key={sk.id}
                              onClick={() => setSelectedSkillId(sk.id)}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${isSel
                                  ? "border-violet-500/60 bg-violet-500/15 text-slate-200"
                                  : "border-slate-700/80 hover:border-slate-600 bg-slate-900/40 text-slate-400"
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <Sparkles size={13} className="text-violet-400" />
                                <span className="font-medium text-slate-200">
                                  {sk.title}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {sk.nodesCount} 个节点 · {sk.category}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 操作按钮组 */}
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="flex-1 py-2 text-sm text-slate-400 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={createProjectMutation.isPending}
                    className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${createType === "READING"
                        ? "text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 ring-1 ring-cyan-500/40"
                        : "text-violet-300 bg-violet-500/20 hover:bg-violet-500/30 ring-1 ring-violet-500/40"
                      } ${createProjectMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {createProjectMutation.isPending ? (
                      "创建中..."
                    ) : (
                      <>
                        <Plus size={14} />
                        创建{createType === "READING" ? "阅读" : "计划"}项目
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
