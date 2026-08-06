import { Loader2, Wand2 } from "lucide-react"
import { AnnotationLegendPopover } from "./AnnotationLegendPopover"

interface ReadingArticleHeaderProps {
  chapterTitle?: string
  contentData?: {
    chapter_index: number
    total_blocks: number
  } | null
  hasAnnotations: boolean
  isPending: boolean
  onAIAnnotate: () => void
}

export function ReadingArticleHeader({
  chapterTitle,
  contentData,
  hasAnnotations,
  isPending,
  onAIAnnotate,
}: ReadingArticleHeaderProps) {
  return (
    <div className="mb-8 pb-5 border-b border-slate-800/60 font-sans">
      <div className="flex items-start justify-between gap-6">
        {/* 左侧：章节大标题与出版切片元数据 */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-slate-100 tracking-tight leading-tight">
            {chapterTitle || "乡土本色"}
          </h1>

          {contentData && (
            <div className="text-xs text-slate-400 font-mono flex items-center gap-3 mt-3">
              <span className="bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded-md text-cyan-400 font-medium shadow-xs">
                切片索引：#{contentData.chapter_index}
              </span>
              <span className="text-slate-600">•</span>
              <span>总切片数：{contentData.total_blocks}</span>
            </div>
          )}
        </div>

        {/* 右侧 Action 区：胶囊按钮组 */}
        <div className="flex items-center gap-2.5 shrink-0 pt-1">
          {/* 仅在获取不到标注时展示“AI 智能标注”主行动按钮 */}
          {!hasAnnotations && (
            <button
              onClick={onAIAnnotate}
              disabled={isPending}
              className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600/40 via-purple-500/35 to-indigo-600/40 hover:from-violet-600/60 hover:to-indigo-600/60 border border-violet-400/60 hover:border-violet-300 text-violet-100 hover:text-white font-semibold transition-all duration-200 text-xs cursor-pointer shadow-[0_0_18px_rgba(139,92,246,0.35)] hover:shadow-[0_0_24px_rgba(139,92,246,0.5)] active:scale-95 whitespace-nowrap disabled:opacity-50"
              title="触发 AI 对当前章节进行自动重点标注"
            >
              {isPending ? (
                <Loader2 size={13} className="animate-spin text-violet-300 shrink-0" />
              ) : (
                <Wand2 size={13} className="text-violet-300 group-hover:rotate-12 transition-transform shrink-0" />
              )}
              <span>{isPending ? "AI 分析标注中..." : "AI 智能标注"}</span>
            </button>
          )}

          {/* 图例/标注说明按钮与 Popover */}
          <AnnotationLegendPopover />
        </div>
      </div>
    </div>
  )
}
