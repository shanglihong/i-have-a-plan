import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Network, Sparkles } from "lucide-react";

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
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate("/graph")}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-slate-300 hover:text-slate-100 bg-slate-900/80 hover:bg-slate-800 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer font-semibold shadow-sm"
          >
            <Network size={14} className="text-cyan-400" />
            知识图谱
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-cyan-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 rounded-xl font-bold shadow-md shadow-cyan-500/20 transition-all duration-200 cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            新建项目
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
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
