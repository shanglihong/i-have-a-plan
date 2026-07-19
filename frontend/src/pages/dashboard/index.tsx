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
  Archive,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles,
  AlertCircle,
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
    desc: "预计本周完成 2 个阶段里程碑",
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
    desc: "发现 1 个阻断依赖，预计延迟 3 天",
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

  const [filter, setFilter] = useState<"ALL" | "READING" | "PLAN">("ALL");
  const [suspendedStates, setSuspendedStates] = useState<Record<string, boolean>>({
    "4": true,
  });

  // 项目列表 Query (强化 Project 实体强类型推导)
  const { data: projectsData } = useQuery<{ items: Project[]; total: number }>({
    queryKey: ["projects", filter],
    queryFn: async () => {
      const res = await api.get("/projects", { params: { status: filter } });
      return res.data;
    },
  });

  const projects: Project[] = projectsData?.items || [];
  const recent: Project[] = projects.slice(0, 4);

  // 创建项目 Mutation (双轨 API 适配)
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

  const handleMoreClick = (e: React.MouseEvent, _projectId: string) => {
    e.stopPropagation();
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">知识工作台</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            实时感知学习进度，驱动知识闭环
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/graph")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/8 rounded-lg ring-1 ring-white/10 transition-all cursor-pointer"
          >
            <Network size={13} />
            知识图谱
          </button>
          <button
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 rounded-lg ring-1 ring-cyan-500/30 transition-all font-medium cursor-pointer"
          >
            <Plus size={13} />
            新建项目
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {STAT_ITEMS.map((s, i) => {
          const colorStyle = COLOR_MAP[s.color];
          const IconComp = s.icon;
          return (
            <div key={i} className="glass rounded-xl p-4 flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg ${colorStyle.bg} flex items-center justify-center shrink-0`}
              >
                <IconComp size={16} className={colorStyle.text} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold text-slate-100 leading-none">
                  {s.value}
                </p>
                <p className="text-xs text-slate-400 mt-1 truncate">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent projects carousel */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-slate-300 mb-3">最近访问</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.type === "READING" ? COLOR_MAP.cyan.bg : COLOR_MAP.violet.bg
                    }`}
                >
                  {p.type === "READING" ? (
                    <BookOpen size={13} className={COLOR_MAP.cyan.text} />
                  ) : (
                    <ListChecks size={13} className={COLOR_MAP.violet.text} />
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
              <p className="text-xs text-slate-400 mt-1.5">{p.progress}% 完成</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Project list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-300">所有项目</h2>
          <div className="flex gap-1">
            {(["ALL", "READING", "PLAN"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${filter === f
                    ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
              >
                {f === "ALL" ? "全部" : f === "READING" ? "阅读" : "计划"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass rounded-xl p-4 relative overflow-hidden cursor-pointer hover:ring-1 hover:ring-white/12 transition-all group ${p.status === "ARCHIVED" ? "opacity-60" : ""
                }`}
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
                <>
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-600/0 via-slate-500/60 to-slate-600/0" />
                  <div className="absolute inset-x-0 top-0 bg-slate-800/60 text-center py-1 text-xs text-slate-400 flex items-center justify-center gap-1">
                    <Archive size={12} /> 只读归档
                  </div>
                </>
              )}

              {/* Suspended overlay */}
              {p.status === "SUSPENDED" && suspendedStates[p.id] && (
                <SuspendedOverlay onResume={() => handleResume(p.id)} />
              )}

              <div
                className={`flex items-start justify-between gap-2 ${p.status === "ARCHIVED" ? "mt-5" : ""
                  }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${p.type === "READING"
                          ? COLOR_MAP.cyan.bg
                          : COLOR_MAP.violet.bg
                        }`}
                    >
                      {p.type === "READING" ? (
                        <BookOpen size={12} className={COLOR_MAP.cyan.text} />
                      ) : (
                        <ListChecks size={12} className={COLOR_MAP.violet.text} />
                      )}
                    </div>
                    <StatusBadge status={p.status} />
                    <div className="flex gap-1 ml-auto">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="text-xs text-slate-300 bg-white/8 px-1.5 py-0.5 rounded border border-white/5"
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
                <button
                  onClick={(e) => handleMoreClick(e, p.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="更多选项"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>

              <div className="mt-3 mb-2">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>{p.progress}% 进度</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {p.deadline}
                  </span>
                </div>
                <ProgressBar
                  value={p.progress}
                  color={p.type === "READING" ? "cyan" : "violet"}
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                {p.notes !== undefined && (
                  <span className="flex items-center gap-1">
                    <Bookmark size={12} /> {p.notes} 笔记
                  </span>
                )}
                {p.tasks !== undefined && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} /> {p.tasks} 任务
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-slate-400 group-hover:text-cyan-400 transition-colors font-medium">
                  进入 <ArrowRight size={12} />
                </span>
              </div>
            </motion.div>
          ))}
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

                  {/* ─── Shared UI 选日积木 ─────────────────────────────────────────── */}
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

                  {/* ─── Shared UI 文件上传积木 (FormData) ─────────────────────────── */}
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

                  {/* ─── 计划项目专属：技能模板注入 (JSON) ─────────────────────────── */}
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
