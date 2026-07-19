import { Clock, Layers } from "lucide-react";
import { Project } from "../../shared/types";
import { ProjectCard } from "./ProjectCard";

interface RecentProjectsGridProps {
  projects: Project[];
  suspendedStates: Record<string, boolean>;
  onResume: (id: string) => void;
}

export function RecentProjectsGrid({
  projects,
  suspendedStates,
  onResume,
}: RecentProjectsGridProps) {
  const recentProjects = projects.slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Clock size={13} className="text-cyan-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-200 tracking-wide">
            最近访问项目
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-mono bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Layers size={11} className="text-cyan-400 shrink-0" />
          最近更新 ({recentProjects.length})
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recentProjects.map((p, idx) => (
          <ProjectCard
            key={p.id}
            project={p}
            index={idx}
            isSuspended={p.status === "SUSPENDED" && !!suspendedStates[p.id]}
            onResume={onResume}
          />
        ))}
      </div>
    </div>
  );
}
