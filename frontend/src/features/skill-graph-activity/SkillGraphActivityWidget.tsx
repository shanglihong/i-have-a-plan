import { useNavigate } from "react-router-dom";
import { Cpu, ExternalLink, GitFork } from "lucide-react";
import { useActiveSkillsQuery } from "../../entities";

export function SkillGraphActivityWidget() {
  const navigate = useNavigate();
  const { data: skillsData, isLoading } = useActiveSkillsQuery();
  const skills = skillsData?.items || [];

  return (
    <div className="glass rounded-2xl p-5 border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Cpu size={13} className="text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide">
            技能引擎与图谱
          </h3>
        </div>
        <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {isLoading ? "请求中" : "活跃中"}
        </span>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-slate-400 font-mono">
            技能引擎查询中...
          </div>
        ) : (
          skills.map((sk) => (
            <div
              key={sk.id}
              className="p-3.5 rounded-xl bg-slate-900/70 border border-white/6 hover:border-emerald-500/30 transition-all duration-200 flex items-center justify-between gap-2 group"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <GitFork size={12} className="text-emerald-400 shrink-0" />
                  <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors truncate">
                    {sk.title}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-normal">
                  已关联 {sk.nodesCount} 个节点 · {sk.status === "DEPLOYED" ? "图谱已部署" : "进行中"}
                </p>
              </div>
              <button
                onClick={() => navigate(sk.sandboxUrl || sk.graphUrl || "/graph")}
                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25 transition-all duration-200 cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>{sk.sandboxUrl ? "沙箱" : "图谱"}</span>
                <ExternalLink size={11} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
