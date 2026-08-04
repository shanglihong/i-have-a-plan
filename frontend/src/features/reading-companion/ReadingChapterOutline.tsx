import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, PanelLeftClose, CheckCircle2, Circle } from "lucide-react"
import { useLayoutStore as useLayout } from "../../shared/store"
import { useBookTocQuery, type TocNodeDO } from "../../entities/book"
import { DualMetricProgressBar } from "./DualMetricProgressBar"
import { cn } from "../../shared/utils/cn"

export interface ChapterItem {
  id: string
  targetChapterId?: string
  label: string
  level: number
  done?: boolean
}

interface ReadingChapterOutlineProps {
  bookId?: string
  chapters?: ChapterItem[]
  activeChapter: string
  onSelectChapter: (id: string) => void
  scrollProgress: number
}

/**
 * 将后端返回的 TocNodeDO 转换为 ChapterItem 列表。
 */
function flattenTocNodes(nodes: TocNodeDO[]): ChapterItem[] {
  const result: ChapterItem[] = []
  function traverse(nodeList: TocNodeDO[], depth: number = 0) {
    for (const node of nodeList) {
      result.push({
        id: node.id,
        targetChapterId: node.target_chapter_id || node.id,
        label: node.title,
        level: depth,
        done: false,
      })
      if (node.children && node.children.length > 0) {
        traverse(node.children, depth + 1)
      }
    }
  }
  traverse(nodes, 0)
  return result
}

export function ReadingChapterOutline({
  bookId,
  chapters: propChapters,
  activeChapter,
  onSelectChapter,
  scrollProgress,
}: ReadingChapterOutlineProps) {
  const outlineOpen = useLayout((s) => s.outlineOpen)
  const setOutlineOpen = useLayout((s) => s.setOutlineOpen)

  const { data: tocResponse, isLoading } = useBookTocQuery(bookId)

  const chapters: ChapterItem[] = useMemo(() => {
    if (tocResponse?.toc_tree && tocResponse.toc_tree.length > 0) {
      return flattenTocNodes(tocResponse.toc_tree)
    }
    return propChapters || []
  }, [tocResponse, propChapters])

  const doneCount = chapters.filter((ch) => ch.done).length
  const totalCount = chapters.length
  const completionPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <AnimatePresence initial={false}>
      {outlineOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="border-r border-slate-800/80 bg-[#0C111D] shrink-0 z-20"
        >
          <div className="w-[300px] h-full flex flex-col">
            {/* Header */}
            <div className="h-12 px-4 border-b border-slate-800/80 bg-[#090D16]/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-cyan-400" />
                <span className="text-xs sm:text-sm font-semibold text-slate-200 tracking-wide">
                  章节大纲
                </span>
                <DualMetricProgressBar scrollProgress={scrollProgress} />
              </div>
              <button
                onClick={() => setOutlineOpen(false)}
                aria-label="收起目录"
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <PanelLeftClose size={15} />
              </button>
            </div>

            {/* Chapters Tree Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
              {isLoading ? (
                <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                  加载章节目录中...
                </div>
              ) : chapters.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  暂无章节大纲数据
                </div>
              ) : (
                chapters.map((ch) => {
                  const depth = ch.level
                  const isCurrent =
                    activeChapter === ch.id ||
                    activeChapter === ch.targetChapterId ||
                    (Boolean(ch.targetChapterId) && activeChapter.includes(ch.targetChapterId!)) ||
                    (Boolean(ch.id) && activeChapter.includes(ch.id))

                  return (
                    <button
                      key={ch.id}
                      onClick={() => onSelectChapter(ch.targetChapterId || ch.id)}
                      title={ch.label}
                      className={cn(
                        "w-full text-left rounded-lg transition-all flex items-center gap-2.5 cursor-pointer border",
                        depth > 0 ? "pr-3 py-2 text-xs font-normal" : "px-3 py-2.5 text-xs sm:text-[13px] font-medium",
                        isCurrent
                          ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border-cyan-500/30 shadow-sm shadow-cyan-950/50"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent"
                      )}
                      style={{
                        paddingLeft: depth > 0 ? `${28 + (depth - 1) * 14}px` : undefined,
                      }}
                    >
                      {ch.done ? (
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <Circle size={14} className="text-cyan-400 fill-cyan-400/30 shrink-0" />
                      ) : (
                        <Circle size={14} className="text-slate-600 shrink-0" />
                      )}
                      <span className="truncate flex-1 min-w-0">{ch.label}</span>
                    </button>
                  )
                })
              )}
            </nav>

            <div className="p-3 border-t border-slate-800/80 bg-[#090D16]/30 text-xs text-slate-500 flex items-center justify-between font-mono">
              <span>共 {totalCount} 章节</span>
              <span className="text-emerald-400/80">已完成 {completionPercent}%</span>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
