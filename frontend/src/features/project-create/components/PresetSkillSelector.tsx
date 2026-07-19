import { Sparkles } from "lucide-react";

export interface SkillOption {
  id: string;
  title: string;
  category: string;
  nodesCount: number;
}

export const PRESET_SKILLS: SkillOption[] = [
  { id: "skill_01", title: "Linux 内核模块分析与调试", category: "系统底层", nodesCount: 14 },
  { id: "skill_02", title: "Graph RAG 知识检索系统架构", category: "AI 与图工程", nodesCount: 9 },
  { id: "skill_03", title: "TypeScript & React 高级模式", category: "前端体系", nodesCount: 12 },
];

interface PresetSkillSelectorProps {
  selectedSkillId: string;
  onSelectSkill: (id: string) => void;
}

export function PresetSkillSelector({
  selectedSkillId,
  onSelectSkill,
}: PresetSkillSelectorProps) {
  return (
    <div>
      <label className="text-xs text-slate-300 mb-1.5 block font-medium flex items-center justify-between">
        <span>可选技能模板注入 (skill_id)</span>
        <span className="text-[11px] text-slate-400 font-normal">
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
          <span className="text-[11px] text-slate-400">零前置模版</span>
        </div>

        {PRESET_SKILLS.map((sk) => {
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
              <span className="text-[11px] text-slate-400">
                {sk.nodesCount} 个节点 · {sk.category}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
