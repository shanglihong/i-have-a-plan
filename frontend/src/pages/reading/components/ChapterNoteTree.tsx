import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronRight, Folder, FolderOpen, BookOpen } from "lucide-react"
import { UnifiedNoteCard, NoteCardData } from "./UnifiedNoteCard"

export interface ChapterGroup {
  id: string
  label: string
  level: number
  notes: NoteCardData[]
}

interface ChapterNoteTreeProps {
  notes: NoteCardData[]
  activeChapterId?: string
  isReadOnly?: boolean
  onTraceAnchor: (anchor: string) => void
  onUpdateNote?: (noteId: string, newContent: string) => void
  onDeleteNote?: (noteId: string) => void
  onExtractSkill?: (note: NoteCardData) => void
}

const DEFAULT_CHAPTER_STRUCTURE = [
  { id: "ch1", label: "第1章 · 前言与理论背景", level: 0 },
  { id: "ch2", label: "第2章 · 神经网络基础与激活函数", level: 0 },
  { id: "ch3", label: "第3章 · 反向传播算法与微积分推导", level: 0 },
  { id: "ch4", label: "第4章 · 优化器与正则化", level: 0 },
  { id: "ch5", label: "第5章 · 深度模型实战", level: 0 },
]

export function ChapterNoteTree({
  notes,
  activeChapterId = "ch3",
  isReadOnly = false,
  onTraceAnchor,
  onUpdateNote,
  onDeleteNote,
  onExtractSkill,
}: ChapterNoteTreeProps) {
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    ch3: true,
  })

  useEffect(() => {
    if (activeChapterId) {
      setExpandedChapters((prev) => ({
        ...prev,
        [activeChapterId]: true,
      }))
    }
  }, [activeChapterId])

  const chapterGroups: ChapterGroup[] = DEFAULT_CHAPTER_STRUCTURE.map((ch) => {
    const matchedNotes = notes.filter((n) => {
      if (!n.anchor) return false
      return (
        n.anchor.includes(ch.id) ||
        n.anchor.includes(ch.label.slice(0, 4)) ||
        (ch.id === "ch3" && (n.anchor.includes("3") || n.anchor.includes("反向传播")))
      )
    })
    return {
      ...ch,
      notes: matchedNotes,
    }
  })

  const unclassifiedNotes = notes.filter((n) => {
    return !DEFAULT_CHAPTER_STRUCTURE.some(
      (ch) =>
        n.anchor?.includes(ch.id) ||
        n.anchor?.includes(ch.label.slice(0, 4)) ||
        (ch.id === "ch3" && (n.anchor?.includes("3") || n.anchor?.includes("反向传播"))),
    )
  })

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }))
  }

  const expandAll = () => {
    const allState: Record<string, boolean> = { unclassified: true }
    DEFAULT_CHAPTER_STRUCTURE.forEach((ch) => {
      allState[ch.id] = true
    })
    setExpandedChapters(allState)
  }

  const collapseAll = () => {
    setExpandedChapters({})
  }

  return (
    <div className="space-y-3 font-sans">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1 py-0.5">
        <span className="font-mono flex items-center gap-1.5 text-slate-300 font-medium">
          <BookOpen size={13} className="text-cyan-400" />
          全书大纲笔记树
        </span>
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={expandAll}
            className="hover:text-cyan-300 cursor-pointer"
          >
            全部展开
          </button>
          <span className="text-slate-700">|</span>
          <button
            onClick={collapseAll}
            className="hover:text-cyan-300 cursor-pointer"
          >
            全部收起
          </button>
        </div>
      </div>

      {/* Chapter Nodes Tree Stream (去框化与三层通透系统) */}
      {chapterGroups.map((group) => {
        const isExpanded = !!expandedChapters[group.id]
        const isActive = activeChapterId === group.id
        const hasNotes = group.notes.length > 0

        return (
          <div key={group.id} className="space-y-1">
            {/* Chapter Node Header (无框轻量 Accordion) */}
            <button
              onClick={() => toggleChapter(group.id)}
              className={`w-full px-2.5 py-1.5 flex items-center justify-between text-left cursor-pointer rounded-xl transition-all ${
                isActive
                  ? "bg-cyan-950/40 text-cyan-300 font-medium"
                  : "text-slate-300 hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-400">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <span className={isActive ? "text-cyan-400" : "text-slate-500"}>
                  {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
                </span>
                <span
                  className={`text-xs sm:text-sm truncate ${
                    isActive ? "font-semibold text-cyan-200" : "font-medium text-slate-200"
                  }`}
                >
                  {group.label}
                </span>
              </div>

              {/* Note Count Badge */}
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                  hasNotes
                    ? isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-slate-800/80 text-slate-400"
                    : "bg-slate-900/60 text-slate-600"
                }`}
              >
                {group.notes.length} 条
              </span>
            </button>

            {/* Collapsible Note Card Stream (通透直铺，解构沉陷内框) */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-1 pb-2">
                    {!hasNotes ? (
                      <div className="py-2 pl-6 text-xs text-slate-500 font-sans italic">
                        本章暂无精读笔记，可在正文中选中划线添加
                      </div>
                    ) : (
                      <div className="relative pl-3.5 space-y-3 border-l border-slate-800/80 ml-3 my-1">
                        {group.notes.map((note) => (
                          <div key={note.id} className="relative">
                            {/* Timeline Node Indicator */}
                            <div className="absolute -left-[19px] top-4 w-2 h-2 rounded-full bg-cyan-500/60 border border-cyan-400/80 shadow-xs ring-4 ring-[#090D16]" />
                            <UnifiedNoteCard
                              note={note}
                              isReadOnly={isReadOnly}
                              onTraceAnchor={onTraceAnchor}
                              onUpdateNote={onUpdateNote}
                              onDeleteNote={onDeleteNote}
                              onExtractSkill={onExtractSkill}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {/* Unclassified Notes Group (if any) */}
      {unclassifiedNotes.length > 0 && (
        <div className="space-y-1">
          <button
            onClick={() => toggleChapter("unclassified")}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-left cursor-pointer rounded-xl hover:bg-slate-800/40 text-slate-300"
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-400">
                {expandedChapters["unclassified"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-300">其他补充笔记</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400">
              {unclassifiedNotes.length} 条
            </span>
          </button>

          <AnimatePresence>
            {expandedChapters["unclassified"] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-1 pb-2">
                  <div className="relative pl-3.5 space-y-3 border-l border-slate-800/80 ml-3 my-1">
                    {unclassifiedNotes.map((note) => (
                      <div key={note.id} className="relative">
                        {/* Timeline Node Indicator */}
                        <div className="absolute -left-[19px] top-4 w-2 h-2 rounded-full bg-cyan-500/60 border border-cyan-400/80 shadow-xs ring-4 ring-[#090D16]" />
                        <UnifiedNoteCard
                          note={note}
                          isReadOnly={isReadOnly}
                          onTraceAnchor={onTraceAnchor}
                          onUpdateNote={onUpdateNote}
                          onDeleteNote={onDeleteNote}
                          onExtractSkill={onExtractSkill}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
