import { PanelLeftOpen, ChevronRight, Clock, PanelRightOpen } from "lucide-react"
import { useLayoutStore as useLayout } from "../../shared/store"
import { StatusBadge } from "../../shared/ui"
import { type ChapterItem } from "./ReadingChapterOutline"

interface ReadingWorkspaceHeaderProps {
  scrollProgress: number
  bookTitle?: string
  chapterTitle?: string
  chapterItem?: ChapterItem
  estimatedMinutes?: number
  onOpenDiscuss?: () => void
}

export function ReadingWorkspaceHeader({
  scrollProgress,
  bookTitle,
  chapterTitle,
  chapterItem,
  estimatedMinutes,
  onOpenDiscuss,
}: ReadingWorkspaceHeaderProps) {
  const outlineOpen = useLayout((s) => s.outlineOpen)
  const setOutlineOpen = useLayout((s) => s.setOutlineOpen)
  const discussOpen = useLayout((s) => s.discussOpen)
  const setDiscussOpen = useLayout((s) => s.setDiscussOpen)

  const currentChapterTitle = chapterItem?.label || chapterTitle

  const handleDiscussClick = () => {
    if (onOpenDiscuss) {
      onOpenDiscuss()
    } else {
      setDiscussOpen(true)
    }
  }

  return (
    <header className="h-12 px-4 border-b border-slate-800/80 bg-[#0C111D]/90 backdrop-blur-md flex items-center gap-3 shrink-0 z-10 relative">
      {!outlineOpen && (
        <button
          onClick={() => setOutlineOpen(true)}
          aria-label="展开目录"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition-colors cursor-pointer"
          title="展开大纲与进度"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-2 min-w-0">
        {bookTitle && (
          <>
            <span className="text-xs text-slate-400 hidden sm:inline truncate font-medium">
              {bookTitle}
            </span>
            {currentChapterTitle && (
              <ChevronRight size={13} className="text-slate-600 hidden sm:inline shrink-0" />
            )}
          </>
        )}
        {currentChapterTitle && (
          <span className="text-xs font-semibold text-slate-100 truncate">
            {currentChapterTitle}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Reading Stats & Actions */}
      <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
        {typeof estimatedMinutes === "number" && !chapterItem?.done && (
          <div className="hidden md:flex items-center gap-1.5 font-mono text-xs bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-full text-slate-300">
            <Clock size={12} className="text-cyan-400" />
            <span>预计 ~{estimatedMinutes} min</span>
          </div>
        )}

        <StatusBadge status="ACTIVE" />

        {!discussOpen && (
          <button
            onClick={handleDiscussClick}
            aria-label="打开伴读与笔记"
            title="展开右侧伴读与笔记侧边栏"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-500/50 rounded-xl text-cyan-300 hover:text-cyan-200 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <PanelRightOpen size={15} className="text-cyan-400" />
            <span className="hidden sm:inline">伴读与笔记</span>
          </button>
        )}
      </div>

      {/* Top Scroll Progress Bar */}
      <div
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-150 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />
    </header>
  )
}
