import { Sparkles } from "lucide-react"
import { CombinedMatch } from "../types"
import { cn } from "../../../../shared/utils/cn"

interface AnnotationPopoverProps {
  cm: CombinedMatch
  isTopBlock: boolean
}

export function AnnotationPopover({ cm, isTopBlock }: AnnotationPopoverProps) {
  return (
    <span
      className={cn(
        "absolute left-1/2 -translate-x-1/2 w-80 p-3.5 bg-slate-900/98 rounded-xl shadow-2xl border border-cyan-500/50 shadow-cyan-950/20 backdrop-blur-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50 text-xs font-normal text-left flex flex-col gap-2.5 select-none",
        isTopBlock ? "top-full mt-3" : "bottom-full mb-3"
      )}
    >
      {/* 指向标注词的定位小三角 */}
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent",
          isTopBlock
            ? "bottom-full -mb-px border-b-6 border-b-cyan-500/50"
            : "top-full -mt-px border-t-6 border-t-cyan-500/50"
        )}
      />

      {/* 1. 读书笔记区块 */}
      {cm.userNote && (
        <span className="flex flex-col gap-1">
          <span className="flex items-center justify-between pb-1 border-b border-slate-800/40">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 tracking-wide font-sans">
              <Sparkles size={11} className="text-cyan-400" />
              <span>读书笔记</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium font-sans bg-slate-800/60 text-slate-400">
              已保存
            </span>
          </span>
          <span className="text-slate-200 text-sm leading-relaxed block">
            {cm.userNote.explanation}
          </span>
        </span>
      )}

      {/* 如果两者同时存在，渲染分隔线 */}
      {cm.userNote && cm.aiAnnotations.length > 0 && (
        <span className="border-t border-slate-800/40 my-0.5 block" />
      )}

      {/* 2. AI 智能解析区块 */}
      {cm.aiAnnotations.map((ai, aIdx) => {
        let labelTag = "核心概念"
        if (ai.category === "conclusion") labelTag = "关键结论"
        if (ai.category === "quote") labelTag = "经典金句"
        if (ai.category === "contrast") labelTag = "概念对比"

        return (
          <span key={aIdx} className="flex flex-col gap-1">
            <span className="flex items-center justify-between pb-1 border-b border-slate-800/40">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 tracking-wide font-sans">
                <Sparkles size={11} className="text-cyan-400" />
                <span>AI 智能解析</span>
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-mono font-normal border",
                  ai.category === "concept" && "bg-amber-950/60 text-amber-300 border-amber-500/30",
                  ai.category === "conclusion" && "bg-violet-950/60 text-violet-300 border-violet-500/30",
                  ai.category === "quote" && "bg-purple-950/60 text-purple-300 border-purple-500/30",
                  ai.category === "contrast" && "bg-teal-950/60 text-teal-300 border-teal-500/30"
                )}
              >
                {labelTag}
              </span>
            </span>
            <span className="text-slate-200 text-sm leading-relaxed block">
              {ai.explanation || `AI 标注分析 · ${ai.category}`}
            </span>
          </span>
        )
      })}
    </span>
  )
}
