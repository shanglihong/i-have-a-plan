import { useNavigate } from "react-router-dom";
import { AlertTriangle, RotateCcw, Zap, AlertCircle, ArrowRight, Library } from "lucide-react";
import { Project } from "../../shared/types";

interface FocusProjectsListProps {
  projects: Project[];
}

export function FocusProjectsList({ projects }: FocusProjectsListProps) {
  const navigate = useNavigate();

  const focusProjects = projects
    .filter(
      (p) => p.status === "SUSPENDED" || p.status === "ACTIVE" || p.progress > 60
    )
    .slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle size={13} className="text-amber-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-200 tracking-wide">
            重点关注项目
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-normal">
          需处理阻塞、恢复进度或生成技能
        </span>
      </div>

      <div className="space-y-3">
        {focusProjects.map((p) => {
          const isSuspended = p.status === "SUSPENDED";
          const isHighProgress = p.progress >= 65;

          const accentBorder = isSuspended
            ? "border-l-4 border-l-amber-400"
            : isHighProgress
              ? "border-l-4 border-l-emerald-400"
              : "border-l-4 border-l-cyan-400";

          return (
            <div
              key={`focus-${p.id}`}
              className={`glass rounded-2xl p-4 border border-white/8 hover:border-white/15 ${accentBorder} transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:shadow-lg`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`w-9.5 h-9.5 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-inner ${
                    isSuspended
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : isHighProgress
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  }`}
                >
                  {isSuspended ? (
                    <RotateCcw size={17} />
                  ) : isHighProgress ? (
                    <Zap size={17} />
                  ) : (
                    <AlertCircle size={17} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        isSuspended
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : isHighProgress
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                      }`}
                    >
                      {isSuspended
                        ? "处于暂停状态"
                        : isHighProgress
                          ? "里程碑即达成"
                          : "进行中关键工程"}
                    </span>
                    {p.kb_name && (
                      <span
                        className="text-xs font-medium text-slate-300 bg-slate-900/80 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1 max-w-[220px] truncate"
                        title={p.kb_name}
                      >
                        <Library size={11} className="text-cyan-400 shrink-0" />
                        <span className="truncate">{p.kb_name}</span>
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">
                      截止时间: {p.deadline}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                    {p.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-normal">
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
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-cyan-500/40 hover:text-cyan-300 transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm group/btn"
                >
                  <span>立即处理</span>
                  <ArrowRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform duration-200" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
