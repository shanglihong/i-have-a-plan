import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, Folder, FolderOpen, FileText, PanelLeftClose, CheckCircle2, ChevronRight, ChevronDown } from "lucide-react"
import { useLayoutStore as useLayout } from "../../shared/store"
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
  chapters?: ChapterItem[]
  isLoading?: boolean
  activeChapter: string
  onSelectChapter: (rootChapterId: string, item: ChapterItem) => void
  scrollProgress: number
  projectProgress: number
}

export function ReadingChapterOutline({
  chapters = [],
  isLoading = false,
  activeChapter,
  onSelectChapter,
  scrollProgress,
  projectProgress,
}: ReadingChapterOutlineProps) {
  const outlineOpen = useLayout((s) => s.outlineOpen)
  const setOutlineOpen = useLayout((s) => s.setOutlineOpen)
  const totalCount = chapters.length
  const completionPercent = projectProgress

  // 1. 计算每个章节的父子关系、祖先节点列表以及对应的顶层 Level 0 根章节 ID
  const chapterMetaMap = useMemo(() => {
    const meta = new Map<
      string,
      { hasChildren: boolean; ancestorIds: string[]; rootChapterId: string }
    >()

    for (let i = 0; i < chapters.length; i++) {
      const current = chapters[i]
      const hasChildren = i < chapters.length - 1 && chapters[i + 1].level > current.level

      const ancestorIds: string[] = []
      let currentLevel = current.level
      let rootChapterId = current.level === 0 ? (current.targetChapterId || current.id) : ""

      for (let j = i - 1; j >= 0; j--) {
        if (chapters[j].level < currentLevel) {
          ancestorIds.push(chapters[j].id)
          currentLevel = chapters[j].level
          if (currentLevel === 0) {
            rootChapterId = chapters[j].targetChapterId || chapters[j].id
            break
          }
        }
      }

      if (!rootChapterId && current.level === 0) {
        rootChapterId = current.targetChapterId || current.id
      }

      meta.set(current.id, { hasChildren, ancestorIds, rootChapterId })
    }

    return meta
  }, [chapters])

  // 2. 展开的父节点集合与精准选中的子节点 ID
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedNodeId, setSelectedNodeId] = useState<string>("")

  // 3. 当 activeChapter 变化时，自动展开当前激活章节的所有祖先路径
  useEffect(() => {
    if (!activeChapter || chapters.length === 0) return

    const activeItem = chapters.find(
      (ch) => activeChapter === ch.id || activeChapter === ch.targetChapterId
    )

    if (activeItem) {
      const meta = chapterMetaMap.get(activeItem.id)
      if (meta && meta.ancestorIds.length > 0) {
        setExpandedIds((prev) => {
          let changed = false
          const next = new Set(prev)
          for (const ancestorId of meta.ancestorIds) {
            if (!next.has(ancestorId)) {
              next.add(ancestorId)
              changed = true
            }
          }
          return changed ? next : prev
        })
      }
    }
  }, [activeChapter, chapters, chapterMetaMap])

  // 切换折叠/展开状态
  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 判断某个章节节点当前是否在界面上可见
  const isItemVisible = (ch: ChapterItem) => {
    if (ch.level === 0) return true
    const meta = chapterMetaMap.get(ch.id)
    if (!meta) return true
    return meta.ancestorIds.every((ancestorId) => expandedIds.has(ancestorId))
  }

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
                  if (!isItemVisible(ch)) return null

                  const depth = ch.level
                  const meta = chapterMetaMap.get(ch.id)
                  const hasChildren = meta?.hasChildren ?? false
                  const isExpanded = expandedIds.has(ch.id)
                  const rootChapterId = meta?.rootChapterId || ch.targetChapterId || ch.id

                  // 判断当前属于活动大章，或单个具体子节点选中
                  const isRootActive = activeChapter === rootChapterId || activeChapter === ch.id || activeChapter === ch.targetChapterId
                  const isNodeSelected = selectedNodeId === ch.id || (!selectedNodeId && isRootActive && depth === 0)

                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setSelectedNodeId(ch.id)
                        onSelectChapter(rootChapterId, ch)
                        if (hasChildren && !isExpanded) {
                          setExpandedIds((prev) => new Set(prev).add(ch.id))
                        }
                      }}
                      title={ch.label}
                      className={cn(
                        "w-full text-left rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border group",
                        depth > 0 ? "pr-2.5 py-1.5 text-xs font-normal" : "px-2.5 py-2 text-xs sm:text-[13px] font-medium",
                        isNodeSelected
                          ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border-cyan-500/30 shadow-sm shadow-cyan-950/50"
                          : isRootActive && depth === 0
                          ? "text-slate-200 border-transparent bg-slate-800/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent"
                      )}
                      style={{
                        paddingLeft: `${10 + depth * 14}px`,
                      }}
                    >
                      {/* 1. 折叠/展开控制按钮 */}
                      {hasChildren ? (
                        <span
                          onClick={(e) => toggleExpand(ch.id, e)}
                          className="p-0.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                        >
                          {isExpanded ? (
                            <ChevronDown size={14} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
                          ) : (
                            <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-200 transition-colors" />
                          )}
                        </span>
                      ) : (
                        <span className="w-4 h-4 shrink-0 inline-block" />
                      )}

                      {/* 2. 节点 Icon：文件夹 / 文章 FileText / 打勾 CheckCircle2 */}
                      {ch.done ? (
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      ) : hasChildren ? (
                        isExpanded ? (
                          <FolderOpen
                            size={14}
                            className={cn(
                              "shrink-0 transition-colors",
                              isNodeSelected ? "text-cyan-400" : isRootActive ? "text-amber-300" : "text-amber-400/70 group-hover:text-amber-300"
                            )}
                          />
                        ) : (
                          <Folder
                            size={14}
                            className={cn(
                              "shrink-0 transition-colors",
                              isNodeSelected ? "text-cyan-400" : isRootActive ? "text-amber-300" : "text-amber-400/70 group-hover:text-amber-300"
                            )}
                          />
                        )
                      ) : (
                        <FileText
                          size={14}
                          className={cn(
                            "shrink-0 transition-colors",
                            isNodeSelected ? "text-cyan-400" : "text-slate-500/80 group-hover:text-slate-300"
                          )}
                        />
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




