import { Info } from "lucide-react"

export function AnnotationLegendPopover() {
  return (
    <div className="relative group inline-flex items-center">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0D182A] hover:bg-[#13223B] border border-cyan-500/50 hover:border-cyan-400 text-cyan-200 hover:text-white transition-all duration-200 text-xs font-medium cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
      >
        <Info size={13} className="text-cyan-400 shrink-0" />
        <span>标注说明</span>
      </button>

      {/* 悬停 Popover 浮层 */}
      <div className="absolute right-0 top-full mt-2 w-48 p-2.5 bg-[#0B1120] border border-slate-700/90 rounded-xl shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto transition-all duration-150 z-50 text-xs font-sans">
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="bg-amber-500/25 text-amber-200 font-medium px-2 py-0.5 rounded-xs text-xs">
              我的笔记
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            <span className="underline decoration-emerald-400 decoration-[2px] underline-offset-4 text-slate-200">
              核心概念
            </span>
            <span className="underline decoration-violet-400 decoration-[2px] underline-offset-4 text-slate-200">
              关键结论
            </span>
            <span className="underline decoration-cyan-400 decoration-[2px] underline-offset-4 text-slate-200">
              经典引文
            </span>
            <span className="underline decoration-wavy decoration-teal-400 decoration-[2px] underline-offset-4 text-slate-200">
              概念对比
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
