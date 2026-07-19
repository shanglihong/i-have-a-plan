import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ListChecks, Clock, ChevronRight, Hash } from "lucide-react";
import { Project } from "../../shared/types";
import { COLOR_MAP } from "../../shared/constants";
import { StatusBadge, ProgressBar } from "../../shared/ui";
import { SuspendedOverlay } from "../project-suspend/SuspendedOverlay";

interface ProjectCardProps {
  project: Project;
  index: number;
  isSuspended: boolean;
  onResume: (id: string) => void;
}

export function ProjectCard({
  project,
  index,
  isSuspended,
  onResume,
}: ProjectCardProps) {
  const navigate = useNavigate();
  const isReading = project.type === "READING";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={() => {
        if (!isSuspended) {
          navigate(
            isReading
              ? `/project/read/${project.id}`
              : `/project/plan/${project.id}`
          );
        }
      }}
      className={`glass rounded-2xl p-5 relative overflow-hidden border transition-all duration-300 cursor-pointer group shadow-lg ${
        isReading
          ? "border-white/10 hover:border-cyan-500/40 hover:shadow-cyan-950/30"
          : "border-white/10 hover:border-violet-500/40 hover:shadow-violet-950/30"
      }`}
    >
      {/* Top Accent Subtle Glow Line */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
          isReading
            ? "from-cyan-400 via-blue-500 to-indigo-500"
            : "from-violet-400 via-purple-500 to-pink-500"
        } opacity-60 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {/* Suspended Overlay */}
      {isSuspended && (
        <SuspendedOverlay onResume={() => onResume(project.id)} />
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center border ${
              isReading
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
          <StatusBadge status={project.status} />
        </div>
        <span className="text-[10px] text-slate-400 font-mono bg-slate-900/60 border border-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Clock size={10} className="text-slate-400" />
          {index === 0 ? "10分钟前" : index === 1 ? "1小时前" : "昨天"}
        </span>
      </div>

      <h3 className="text-sm font-bold text-slate-100 leading-snug line-clamp-2 mb-2.5 group-hover:text-cyan-300 transition-colors duration-200">
        {project.title}
      </h3>

      {/* Tag Pills */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {project.tags.map((t) => (
          <span
            key={t}
            className="text-[10px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded-md border border-white/8 font-medium flex items-center gap-0.5 group-hover:border-white/15 transition-colors"
          >
            <Hash size={9} className="text-slate-400" />
            {t}
          </span>
        ))}
      </div>

      {/* Progress Bar Section */}
      <div className="space-y-1.5 pt-2.5 border-t border-white/5">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="font-semibold text-slate-200 flex items-center gap-1">
            <span className={isReading ? "text-cyan-400" : "text-violet-400"}>
              {project.progress}%
            </span>
            <span className="text-[10px] text-slate-400 font-normal">完成度</span>
          </span>
          <span className="text-[10px] flex items-center gap-1 text-slate-400 font-normal">
            截止: {project.deadline}
          </span>
        </div>
        <ProgressBar
          value={project.progress}
          color={isReading ? "cyan" : "violet"}
        />
      </div>

      {/* Footer Details */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-1">
        <span className="text-[11px] text-slate-400 font-medium">
          {project.notes ? `${project.notes} 篇精读笔记` : `${project.tasks || 0} 个阶段任务`}
        </span>
        <span className="flex items-center gap-0.5 text-xs text-slate-300 group-hover:text-cyan-300 font-semibold transition-colors duration-200">
          <span>进入</span>
          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
        </span>
      </div>
    </motion.div>
  );
}
