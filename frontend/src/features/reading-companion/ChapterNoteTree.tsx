import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronRight, Folder, FolderOpen, BookOpen, Bookmark } from "lucide-react"
import { UnifiedNoteCard, type NoteCardData } from "../unified-note-card"
import { cn } from "../../shared/utils/cn"
import type { ChapterItem } from "./ReadingChapterOutline"
import { useMaterialNotesQuery } from "../../entities/note"

export interface ChapterGroup {
  id: string
  label: string
  level: number
  notes: NoteCardData[]
  targetChapterId?: string
}

interface ChapterNoteTreeProps {
  projectId: string
  chapters?: ChapterItem[]
  activeChapterId?: string
  viewMode?: "tree" | "list"
  searchKeyword?: string
  isReadOnly?: boolean
  onTraceAnchor: (anchor: string, sourceAnchor?: NoteCardData["sourceAnchor"]) => void
  onUpdateNote?: (noteId: string, newContent: string) => void
  onDeleteNote?: (noteId: string) => void
  onExtractSkill?: (note: NoteCardData) => void
}

export function ChapterNoteTree({
  projectId,
  chapters = [],
  activeChapterId,
  viewMode = "tree",
  searchKeyword = "",
  isReadOnly = false,
  onTraceAnchor,
  onUpdateNote,
  onDeleteNote,
  onExtractSkill,
}: ChapterNoteTreeProps) {
  // 0. 章节 Id 去重：优先保留首次出现的 ChapterId，后续重复的不做处理
  const uniqueChapters = useMemo(() => {
    const seen = new Set<string>()
    return chapters.filter((ch) => {
      const idKey = ch.id
      const targetKey = ch.targetChapterId
      if ((idKey && seen.has(idKey)) || (targetKey && seen.has(targetKey))) {
        return false
      }
      if (idKey) seen.add(idKey)
      if (targetKey) seen.add(targetKey)
      return true
    })
  }, [chapters])

  // 1. 计算每个章节的父子关系与祖先节点列表
  const chapterMetaMap = useMemo(() => {
    const meta = new Map<
      string,
      { hasChildren: boolean; ancestorIds: string[]; rootChapterId: string }
    >()

    for (let i = 0; i < uniqueChapters.length; i++) {
      const current = uniqueChapters[i]
      const hasChildren = i < uniqueChapters.length - 1 && uniqueChapters[i + 1].level > current.level

      const ancestorIds: string[] = []
      let currentLevel = current.level
      let rootChapterId = current.level === 0 ? (current.targetChapterId || current.id) : ""

      for (let j = i - 1; j >= 0; j--) {
        if (uniqueChapters[j].level < currentLevel) {
          ancestorIds.push(uniqueChapters[j].id)
          currentLevel = uniqueChapters[j].level
          if (currentLevel === 0) {
            rootChapterId = uniqueChapters[j].targetChapterId || uniqueChapters[j].id
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
  }, [uniqueChapters])

  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>(() => {
    if (activeChapterId) {
      return { [activeChapterId]: true }
    }
    return {}
  })

  // 当 activeChapterId 发生变更时，自动展开对应章节及其祖先路径，并收缩其他不相关父章节
  useEffect(() => {
    if (activeChapterId && uniqueChapters.length > 0) {
      const nextExpanded: Record<string, boolean> = {}
      uniqueChapters.forEach((ch) => {
        const isMatch =
          activeChapterId === ch.id ||
          activeChapterId === ch.targetChapterId ||
          (Boolean(ch.targetChapterId) && activeChapterId.includes(ch.targetChapterId!)) ||
          (Boolean(ch.id) && activeChapterId.includes(ch.id))

        if (isMatch) {
          nextExpanded[ch.id] = true
          const meta = chapterMetaMap.get(ch.id)
          if (meta?.ancestorIds) {
            meta.ancestorIds.forEach((ancId) => {
              nextExpanded[ancId] = true
            })
          }
        }
      })
      if (Object.keys(nextExpanded).length > 0) {
        setExpandedChapters(nextExpanded)
      }
    }
  }, [activeChapterId, uniqueChapters, chapterMetaMap])

  const { data: notesData, isLoading } = useMaterialNotesQuery({
    project_id: projectId,
    limit: 100,
  })

  const notes: NoteCardData[] = useMemo(() => {
    const items = notesData?.items || []
    return items.map((item: any) => ({
      id: item.id,
      anchor: item.anchor_summary || "",
      quote: item.raw_quote,
      content: item.user_interpretation,
      createdAt: item.created_at,
      sourceAnchor: item.source_anchor,
    }))
  }, [notesData])

  const filteredNotes = useMemo(() => {
    if (!searchKeyword) return notes
    const lower = searchKeyword.toLowerCase()
    return notes.filter(
      (n) =>
        n.content?.toLowerCase().includes(lower) ||
        n.quote?.toLowerCase().includes(lower) ||
        n.anchor?.toLowerCase().includes(lower) ||
        n.sourceAnchor?.feature_text?.toLowerCase().includes(lower)
    )
  }, [notes, searchKeyword])

  // 保留全量章节作为层级 Group
  const chapterGroups = useMemo(() => {
    // 1. 计算每个章节的直属匹配笔记
    const directNotesMap = new Map<string, NoteCardData[]>()
    uniqueChapters.forEach((ch) => {
      const matchedNotes = filteredNotes.filter((n) => {
        if (n.sourceAnchor?.chapter_id) {
          return (
            n.sourceAnchor.chapter_id === ch.id ||
            n.sourceAnchor.chapter_id === ch.targetChapterId
          )
        }
        if (!n.anchor) return false
        return (
          n.anchor.includes(ch.id) ||
          (ch.targetChapterId && n.anchor.includes(ch.targetChapterId)) ||
          n.anchor.includes(ch.label) ||
          (ch.label.length >= 4 && n.anchor.includes(ch.label.slice(0, 4)))
        )
      })
      directNotesMap.set(ch.id, matchedNotes)
    })

    // 2. 汇总章节本身的直属笔记以及所有后代子章节的笔记总数
    return uniqueChapters.map((ch) => {
      const directNotes = directNotesMap.get(ch.id) || []
      let totalCount = directNotes.length

      uniqueChapters.forEach((subCh) => {
        if (subCh.id !== ch.id) {
          const meta = chapterMetaMap.get(subCh.id)
          if (meta?.ancestorIds.includes(ch.id)) {
            const subNotes = directNotesMap.get(subCh.id) || []
            totalCount += subNotes.length
          }
        }
      })

      return {
        id: ch.id,
        label: ch.label,
        level: ch.level,
        notes: directNotes,
        totalNotesCount: totalCount,
        targetChapterId: ch.targetChapterId,
      }
    })
  }, [uniqueChapters, filteredNotes, chapterMetaMap])

  // 未能匹配到任何章节的补充笔记
  const unclassifiedNotes = useMemo(() => {
    return filteredNotes.filter((n) => {
      if (n.sourceAnchor?.chapter_id) {
        return !uniqueChapters.some(
          (ch) =>
            n.sourceAnchor?.chapter_id === ch.id ||
            n.sourceAnchor?.chapter_id === ch.targetChapterId
        )
      }
      return !uniqueChapters.some(
        (ch) =>
          n.anchor?.includes(ch.id) ||
          (ch.targetChapterId && n.anchor?.includes(ch.targetChapterId)) ||
          n.anchor?.includes(ch.label) ||
          (ch.label.length >= 4 && n.anchor?.includes(ch.label.slice(0, 4)))
      )
    })
  }, [uniqueChapters, filteredNotes])

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const isExpanded = !!prev[chapterId]
      if (isExpanded) {
        const next = { ...prev }
        delete next[chapterId]
        return next
      } else {
        const next: Record<string, boolean> = { [chapterId]: true }
        const meta = chapterMetaMap.get(chapterId)
        if (meta?.ancestorIds) {
          meta.ancestorIds.forEach((ancId) => {
            next[ancId] = true
          })
        }
        return next
      }
    })
  }

  const expandAll = () => {
    const allState: Record<string, boolean> = { unclassified: true }
    uniqueChapters.forEach((ch) => {
      allState[ch.id] = true
    })
    setExpandedChapters(allState)
  }

  const collapseAll = () => {
    setExpandedChapters({})
  }

  // 判断某个章节节点当前是否在界面上可见（所有父节点需展开）
  const isItemVisible = (ch: ChapterItem) => {
    if (ch.level === 0) return true
    const meta = chapterMetaMap.get(ch.id)
    if (!meta) return true
    return meta.ancestorIds.every((ancestorId) => !!expandedChapters[ancestorId])
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-xs text-slate-500 font-mono">
        正在读取笔记树数据...
      </div>
    )
  }

  if (viewMode === "list") {
    if (filteredNotes.length === 0) {
      return (
        <div className="py-12 text-center text-xs sm:text-sm text-slate-500 flex flex-col items-center gap-2 font-sans">
          <Bookmark size={26} className="text-slate-700" />
          <span>暂无相关精读笔记，划选正文可快速添加</span>
        </div>
      )
    }

    return (
      <div className="relative pl-3.5 space-y-3.5 border-l border-slate-700/80 ml-2 my-1">
        {filteredNotes.map((note) => (
          <div key={note.id} className="relative">
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
    )
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

      {/* Chapter Nodes Tree Stream */}
      {chapterGroups.map((group) => {
        const originalChapter = chapters.find((ch) => ch.id === group.id)
        if (originalChapter && !isItemVisible(originalChapter)) return null

        const meta = chapterMetaMap.get(group.id)
        const hasChildren = meta?.hasChildren ?? false
        const isExpanded = !!expandedChapters[group.id]
        const isActive =
          !!activeChapterId &&
          (activeChapterId === group.id ||
            activeChapterId === group.targetChapterId ||
            (Boolean(group.targetChapterId) && activeChapterId.includes(group.targetChapterId!)) ||
            (Boolean(group.id) && activeChapterId.includes(group.id)))
        const hasDirectNotes = group.notes.length > 0
        const hasTotalNotes = group.totalNotesCount > 0

        return (
          <div key={group.id} className="space-y-1">
            <button
              onClick={() => toggleChapter(group.id)}
              style={{ paddingLeft: `${8 + group.level * 14}px` }}
              className={cn(
                "w-full pr-2.5 py-1.5 flex items-center justify-between text-left cursor-pointer rounded-xl transition-all",
                isActive
                  ? "bg-cyan-950/40 text-cyan-300 font-medium"
                  : "text-slate-300 hover:bg-slate-800/40"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-400">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <span className={isActive ? "text-cyan-400" : "text-slate-500"}>
                  {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
                </span>
                <span
                  className={cn(
                    "text-xs sm:text-sm truncate",
                    isActive ? "font-semibold text-cyan-200" : "font-medium text-slate-200"
                  )}
                >
                  {group.label}
                </span>
              </div>

              {/* Note Count Badge */}
              <span
                className={cn(
                  "text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full shrink-0 transition-colors border",
                  hasTotalNotes
                    ? isActive
                      ? "bg-cyan-500/25 text-cyan-200 border-cyan-400/60 shadow-xs"
                      : "bg-cyan-950/80 text-cyan-300 border-cyan-800/70"
                    : "bg-slate-900/90 text-slate-400 border-slate-800/80"
                )}
              >
                {group.totalNotesCount} 条
              </span>
            </button>

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
                    {!hasDirectNotes ? (
                      !hasChildren && (
                        <div
                          className="py-2 text-xs text-slate-500 font-sans italic"
                          style={{ paddingLeft: `${24 + group.level * 14}px` }}
                        >
                          本章暂无精读笔记，可在正文中选中划线添加
                        </div>
                      )
                    ) : (
                      <div
                        className="relative pl-3.5 space-y-3 border-l border-slate-700/80 my-1"
                        style={{ marginLeft: `${20 + group.level * 14}px` }}
                      >
                        {group.notes.map((note) => (
                          <div key={note.id} className="relative">
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

      {/* Unclassified Notes Group */}
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
              <span className="text-slate-500">
                {expandedChapters["unclassified"] ? <FolderOpen size={14} /> : <Folder size={14} />}
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
                  <div className="relative pl-3.5 space-y-3 border-l border-slate-700/80 ml-3 my-1">
                    {unclassifiedNotes.map((note) => (
                      <div key={note.id} className="relative">
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
