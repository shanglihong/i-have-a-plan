import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Network, Sparkles, BookOpen, ListChecks } from "lucide-react";

import { ProjectType } from "../../shared/types";
import { useProjectsQuery, useResumeProjectMutation } from "../../entities";
import { Button, Badge } from "../../shared/ui";
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
    <div className="h-full overflow-y-auto px-7 py-6 custom-scrollbar">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7 pb-4 border-b border-white/6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-100 tracking-tight">
              知识工作台
            </h1>
            <Badge variant="cyan">
              <Sparkles size={11} className="text-cyan-400" />
              v1.0
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-normal">
            感知精读与计划里程碑，驱动沉淀为可复用的技能拓扑
          </p>
        </div>

        {/* 顶部操作按钮组 */}
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="secondary" onClick={() => navigate("/graph")}>
            <Network size={16} className="text-cyan-400 group-hover:scale-110 transition-transform duration-200" />
            知识图谱
          </Button>

          <Button variant="cyan" onClick={() => handleOpenCreate("READING")}>
            <BookOpen size={16} className="text-slate-950 group-hover:scale-110 transition-transform duration-200" />
            新建阅读项目
          </Button>

          <Button variant="violet" onClick={() => handleOpenCreate("PLAN")}>
            <ListChecks size={16} className="text-white group-hover:scale-110 transition-transform duration-200" />
            新建计划项目
          </Button>
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
