import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Network, Sparkles, BookOpen, ListChecks } from "lucide-react";

import { ProjectType } from "../../shared/types";
import { useProjectsQuery, useResumeProjectMutation } from "../../entities";
import {
  DashboardStatsGrid,
  RecentProjectsGrid,
  FocusProjectsList,
  KnowledgeInsightsWidget,
  SkillGraphActivityWidget,
  CreateProjectModal,
} from "../../features";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [createType, setCreateType] = useState<ProjectType>("READING");
  const [createOpen, setCreateOpen] = useState(false);

  const [suspendedStates, setSuspendedStates] = useState<Record<string, boolean>>({
    "4": true,
  });

  // 项目列表 Entity Query Hook
  const { data: projectsData } = useProjectsQuery();
  const projects = projectsData?.items || [];

  // 项目恢复 Entity Mutation Hook
  const resumeProjectMutation = useResumeProjectMutation();

  const handleResume = (id: string) => {
    resumeProjectMutation.mutate(id, {
      onSuccess: () => {
        setSuspendedStates((s) => ({ ...s, [id]: false }));
      },
    });
  };

  const handleOpenCreate = (type: ProjectType) => {
    setCreateType(type);
    setCreateOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto px-7 py-6 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7 pb-4 border-b border-white/6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-100 tracking-tight">
              知识工作台
            </h1>
            <span className="text-xs font-mono font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={11} className="text-cyan-400" />
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-normal">
            感知精读与计划里程碑，驱动沉淀为可复用的技能拓扑
          </p>
        </div>

        {/* 顶部操作按钮组 */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate("/graph")}
            className="group flex items-center gap-2 px-4 py-2.5 text-xs text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800/90 backdrop-blur-md rounded-xl border border-slate-700/80 hover:border-slate-500/80 transition-all duration-200 cursor-pointer font-semibold shadow-md hover:shadow-cyan-950/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"          >
            <Network size={16} className="text-cyan-400 group-hover:scale-110 transition-transform duration-200" />
            知识图谱
          </button>

          {/* 拆分出的新建阅读项目按钮 */}
          <button
            onClick={() => handleOpenCreate("READING")}
            className="group flex items-center gap-2 px-4.5 py-2.5 text-xs text-slate-950 font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-300 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            <BookOpen size={16} className="text-slate-950 group-hover:scale-110 transition-transform duration-200" />
            新建阅读项目
          </button>

          {/* 拆分出的新建计划项目按钮（Linear 级 3D 悬浮高感 Violet CTA） */}
          <button
            onClick={() => handleOpenCreate("PLAN")}
            className="group flex items-center gap-2 px-4.5 py-2.5 text-xs text-white font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/35 hover:shadow-violet-400/55 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            <ListChecks size={16} className="text-white group-hover:scale-110 transition-transform duration-200" />            新建计划项目
          </button>
        </div>
      </div>

      {/* 1. 顶部统计指标 */}
      <DashboardStatsGrid />

      {/* 2. 主区 8 : 侧边栏 4 布局网格 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* 左侧主内容区 (8 cols) */}
        <div className="lg:col-span-8 space-y-7">
          <RecentProjectsGrid
            projects={projects}
            suspendedStates={suspendedStates}
            onResume={handleResume}
          />
          <FocusProjectsList projects={projects} />
        </div>

        {/* 右侧边栏区 (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <KnowledgeInsightsWidget />
          <SkillGraphActivityWidget />
        </div>
      </div>

      {/* 3. 创建项目模态框 Feature */}
      <CreateProjectModal
        open={createOpen}
        createType={createType}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
