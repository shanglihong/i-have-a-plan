import { Sparkles, Loader2, Check } from "lucide-react";
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
      {/* 标签行：去技术词，右侧改为语义化提示 */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-slate-300 font-medium">
          技能模板
          <span className="text-slate-500 font-normal ml-1">可选</span>
        </label>
        <span className="text-[11px] text-slate-500">
          注入后自动生成任务骨架
        </span>
      </div>

      <div className="space-y-1.5">
        {/* 「不使用模板」选项 */}
        <button
          type="button"
          onClick={() => onSelectSkill("")}
          className={`w-full p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between group ${
            selectedSkillId === ""
              ? "border-violet-500/50 bg-violet-500/12 ring-1 ring-violet-500/25"
              : "border-slate-700/60 hover:border-slate-600/80 bg-slate-900/40 hover:bg-slate-800/50"
          }`}
        >
          <div className="flex items-center gap-2">
            {/* 选中态：勾选图标；未选中：占位圆圈 */}
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                selectedSkillId === ""
                  ? "bg-violet-500/30 text-violet-300"
                  : "border border-slate-600 group-hover:border-slate-500"
              }`}
            >
              {selectedSkillId === "" && <Check size={10} strokeWidth={2.5} />}
            </span>
            <span
              className={`text-sm font-medium transition-colors ${
                selectedSkillId === "" ? "text-slate-100" : "text-slate-300"
              }`}
            >
              不使用模板
            </span>
          </div>
          <span
            className={`text-xs transition-colors ${
              selectedSkillId === "" ? "text-violet-300/70" : "text-slate-500"
            }`}
          >
            从零构建
          </span>
        </button>

        {/* 技能列表 */}
        {isLoading ? (
          <div className="py-5 rounded-lg border border-slate-700/40 bg-slate-900/20 flex items-center justify-center gap-2">
            <Loader2 size={13} className="animate-spin text-violet-400" />
            <span className="text-xs text-slate-400">加载技能模板中...</span>
          </div>
        ) : skills.length === 0 ? (
          <div className="py-4 rounded-lg border border-slate-700/40 bg-slate-900/20 text-center">
            <p className="text-xs text-slate-500">暂无可用技能模板</p>
          </div>
        ) : (
          skills.map((sk) => {
            const isSel = selectedSkillId === sk.id;
            return (
              <button
                type="button"
                key={sk.id}
                onClick={() => onSelectSkill(sk.id)}
                className={`w-full p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between group ${
                  isSel
                    ? "border-violet-500/50 bg-violet-500/12 ring-1 ring-violet-500/25"
                    : "border-slate-700/60 hover:border-slate-600/80 bg-slate-900/40 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* 选中指示 */}
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isSel
                        ? "bg-violet-500/30 text-violet-300"
                        : "border border-slate-600 group-hover:border-slate-500"
                    }`}
                  >
                    {isSel ? (
                      <Check size={10} strokeWidth={2.5} />
                    ) : (
                      <Sparkles
                        size={9}
                        className="text-slate-600 group-hover:text-slate-500"
                      />
                    )}
                  </span>
                  {/* 技能名：可读性提升 text-sm + text-slate-200 */}
                  <span
                    className={`text-sm font-medium truncate transition-colors ${
                      isSel ? "text-slate-100" : "text-slate-300"
                    }`}
                  >
                    {sk.title}
                  </span>
                </div>
                {/* 元数据：text-slate-400 → text-slate-400，改为更紧凑格式 */}
                <span
                  className={`text-[11px] flex-shrink-0 ml-2 transition-colors ${
                    isSel ? "text-violet-300/70" : "text-slate-500"
                  }`}
                >
                  {sk.nodesCount}节 · {sk.category}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

