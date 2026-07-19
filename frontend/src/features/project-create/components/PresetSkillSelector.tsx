import { Sparkles, Loader2 } from "lucide-react";
import { useSearchSkillsQuery } from "../../../entities";

interface PresetSkillSelectorProps {
  selectedSkillId: string;
  onSelectSkill: (id: string) => void;
}

export function PresetSkillSelector({
  selectedSkillId,
  onSelectSkill,
}: PresetSkillSelectorProps) {
  const { data, isLoading } = useSearchSkillsQuery();
  const skills = data?.items || [];

  return (
    <div>
      <label className="text-xs text-slate-300 mb-1.5 block font-medium flex items-center justify-between">
        <span>可选技能模板注入 (skill_id)</span>
        <span className="text-xs text-slate-400 font-normal">
          可选从零开始或注入标准技能
        </span>
      </label>
      <div className="space-y-2">
        <div
          onClick={() => onSelectSkill("")}
          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
            selectedSkillId === ""
              ? "border-violet-500/60 bg-violet-500/15 text-slate-200"
              : "border-slate-700/80 hover:border-slate-600 bg-slate-900/40 text-slate-400"
          }`}
        >
          <span className="font-medium">无 (从零创建自订任务树)</span>
          <span className="text-xs text-slate-400">零前置模版</span>
        </div>

        {isLoading ? (
          <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-900/20 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin text-violet-400" />
            <span>加载推荐技能中...</span>
          </div>
        ) : (
          skills.map((sk) => {
            const isSel = selectedSkillId === sk.id;
            return (
              <div
                key={sk.id}
                onClick={() => onSelectSkill(sk.id)}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                  isSel
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
                <span className="text-xs text-slate-400">
                  {sk.nodesCount} 个节点 · {sk.category}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
