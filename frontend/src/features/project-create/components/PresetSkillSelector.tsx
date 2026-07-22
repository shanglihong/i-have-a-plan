import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Check, ChevronDown, Layers } from "lucide-react";
import { useSearchSkillsQuery } from "../../../entities";

interface PresetSkillSelectorProps {
  selectedSkillId: string;
  onSelectSkill: (id: string) => void;
}

export function PresetSkillSelector({
  selectedSkillId,
  onSelectSkill,
}: PresetSkillSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useSearchSkillsQuery();
  const skills = data?.items || [];

  const selectedSkill = skills.find((sk) => sk.id === selectedSkillId);

  // 点击外部自动收起下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 键盘导航支持 (WCAG 交互规范)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const allValues = ["", ...skills.map((s) => s.id)];
      const currentIndex = allValues.indexOf(selectedSkillId);
      const nextIndex =
        e.key === "ArrowDown"
          ? (currentIndex + 1) % allValues.length
          : (currentIndex - 1 + allValues.length) % allValues.length;
      onSelectSkill(allValues[nextIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 标签行 */}
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor="preset-skill-trigger"
          className="text-xs text-slate-300 font-medium flex items-center gap-1 cursor-pointer"
        >
          技能模板
          <span className="text-slate-500 font-normal ml-0.5">可选</span>
        </label>
        <span className="text-[11px] text-slate-500">
          注入后自动生成任务骨架
        </span>
      </div>

      {/* 下拉触发按钮 */}
      <button
        id="preset-skill-trigger"
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="选择技能模板"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-[42px] bg-slate-900/90 border rounded-xl px-3 py-2 text-sm text-slate-100 outline-none transition-all flex items-center justify-between cursor-pointer group ${
          isOpen
            ? "border-violet-500/60 ring-1 ring-violet-500/40 shadow-lg shadow-violet-950/30"
            : "border-slate-700/80 hover:border-slate-600/90 hover:bg-slate-850"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          {isLoading ? (
            <Loader2 size={15} className="animate-spin text-violet-400 shrink-0" />
          ) : selectedSkill ? (
            <div className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center shrink-0 border border-violet-500/30">
              <Sparkles size={11} className="text-violet-300" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md bg-slate-800/80 flex items-center justify-center shrink-0 border border-slate-700">
              <Layers size={11} className="text-slate-400" />
            </div>
          )}

          <span className="truncate text-slate-200 text-sm font-medium">
            {isLoading
              ? "加载技能模板中..."
              : selectedSkill
              ? selectedSkill.title
              : "不使用模板 (从零构建)"}
          </span>

          {selectedSkill && (
            <span className="text-[11px] text-violet-300/80 shrink-0 ml-auto bg-violet-500/12 px-2 py-0.5 rounded-md border border-violet-500/20 font-normal">
              {selectedSkill.nodesCount}节 · {selectedSkill.category}
            </span>
          )}
        </div>

        <ChevronDown
          size={15}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-violet-400" : "group-hover:text-slate-300"
          }`}
        />
      </button>

      {/* 下拉浮层列表 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="listbox"
            aria-label="技能模板选项"
            className="absolute left-0 right-0 mt-1.5 z-50 bg-[#0F172A]/95 backdrop-blur-xl border border-slate-800 rounded-xl p-1.5 shadow-2xl shadow-slate-950/80 space-y-1 max-h-56 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* 「不使用模板」选项 */}
            <button
              type="button"
              role="option"
              aria-selected={selectedSkillId === ""}
              onClick={() => {
                onSelectSkill("");
                setIsOpen(false);
              }}
              className={`w-full min-h-[38px] p-2 rounded-lg text-left cursor-pointer transition-all flex items-center justify-between text-xs group ${
                selectedSkillId === ""
                  ? "bg-violet-500/15 text-violet-300 font-medium"
                  : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    selectedSkillId === ""
                      ? "bg-violet-500/30 text-violet-300"
                      : "border border-slate-600 group-hover:border-slate-500"
                  }`}
                >
                  {selectedSkillId === "" && <Check size={10} strokeWidth={2.5} />}
                </span>
                <span className="font-medium">不使用模板</span>
              </div>
              <span className="text-slate-500 text-[11px]">从零构建</span>
            </button>

            {/* 列表分割线 */}
            {skills.length > 0 && <div className="h-px bg-slate-800/80 my-1" />}

            {/* 技能模板动态列表 */}
            {skills.map((sk) => {
              const isSel = selectedSkillId === sk.id;
              return (
                <button
                  key={sk.id}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  onClick={() => {
                    onSelectSkill(sk.id);
                    setIsOpen(false);
                  }}
                  className={`w-full min-h-[38px] p-2 rounded-lg text-left cursor-pointer transition-all flex items-center justify-between text-xs group ${
                    isSel
                      ? "bg-violet-500/15 text-violet-300 font-medium"
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSel
                          ? "bg-violet-500/30 text-violet-300"
                          : "border border-slate-600 group-hover:border-slate-500"
                      }`}
                    >
                      {isSel ? (
                        <Check size={10} strokeWidth={2.5} />
                      ) : (
                        <Sparkles size={9} className="text-slate-500 group-hover:text-slate-400" />
                      )}
                    </span>
                    <span className="truncate">{sk.title}</span>
                  </div>

                  <span className="text-[11px] text-slate-500 shrink-0 ml-2">
                    {sk.nodesCount}节 · {sk.category}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
