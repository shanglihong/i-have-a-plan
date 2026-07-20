import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Quote,
  Target,
  Sparkles,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { READING_TOKENS } from "../../../shared/constants"

export interface NoteCardData {
  id: string
  anchor: string
  quote?: string
  content: string
  createdAt?: string
}

interface UnifiedNoteCardProps {
  note: NoteCardData
  isReadOnly?: boolean
  onTraceAnchor: (anchor: string) => void
  onUpdateNote?: (noteId: string, newContent: string) => void
  onDeleteNote?: (noteId: string) => void
  onExtractSkill?: (note: NoteCardData) => void
}

export function UnifiedNoteCard({
  note,
  isReadOnly = false,
  onTraceAnchor,
  onUpdateNote,
  onDeleteNote,
  onExtractSkill,
}: UnifiedNoteCardProps) {
  const [content, setContent] = useState(note.content || "")
  const [isSaved, setIsSaved] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 1. 无滚动条 Auto-Growing Textarea 高度自适应
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    setContent(note.content || "")
  }, [note.content])

  useLayoutEffect(() => {
    adjustHeight()
  }, [content, adjustHeight])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showMenu])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return
    const val = e.target.value
    setContent(val)
    setIsSaved(false)
    adjustHeight()

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      onUpdateNote?.(note.id, val)
      setIsSaved(true)
    }, 500)
  }

  const handleCopy = () => {
    const textToCopy = note.quote ? `引文：${note.quote}\n笔记：${content}` : content
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setShowMenu(false)
    setTimeout(() => setCopied(false), 2000)
  }

  // 计算是否属于超长需要折叠的笔记 (基于文本字数与引用总长)
  const isLongContent = (note.quote?.length || 0) + content.length > 110

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isReadOnly ? 0.65 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowMenu(false)
      }}
      className={`group p-3 relative font-sans ${READING_TOKENS.surface.hoverCard} ${
        isReadOnly ? "opacity-65 cursor-not-allowed" : ""
      }`}
    >
      {/* ── 1. Card Header: Anchor Label + Primary [原文定位] + More Menu ── */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={READING_TOKENS.surface.anchorBadge}>
            {note.anchor}
          </span>
          {note.createdAt && (
            <span className={`${READING_TOKENS.typography.meta} hidden sm:inline-flex items-center gap-1 shrink-0`}>
              <Clock size={11} />
              {note.createdAt}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Primary Action: 原文定位 */}
          <button
            onClick={() => onTraceAnchor(note.anchor)}
            className="flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-100 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 px-2 py-0.5 rounded-md transition-all cursor-pointer shadow-xs"
            title="平滑滚动定位至原文段落"
          >
            <Target size={11} className="text-cyan-400" />
            <span>定位</span>
          </button>

          {/* More Actions Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              disabled={isReadOnly}
              className={`p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/80 transition-opacity cursor-pointer ${
                isHovered || showMenu ? "opacity-100" : "opacity-50"
              }`}
              title="更多操作"
            >
              <MoreHorizontal size={14} />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-7 z-40 w-36 bg-[#121A29] border border-slate-700/90 rounded-xl shadow-2xl py-1 backdrop-blur-xl text-xs text-slate-200 font-sans"
                >
                  <button
                    onClick={() => {
                      onExtractSkill?.(note)
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-violet-500/20 hover:text-violet-300 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Sparkles size={13} className="text-violet-400" />
                    <span>提炼技能 (L1)</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-800 hover:text-cyan-300 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copied ? "已复制" : "复制笔记"}</span>
                  </button>

                  {!isReadOnly && onDeleteNote && (
                    <button
                      onClick={() => {
                        onDeleteNote(note.id)
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-3.5 py-1.5 hover:bg-rose-950/50 hover:text-rose-300 flex items-center gap-2 cursor-pointer font-medium border-t border-slate-800/80 mt-0.5 pt-1.5"
                    >
                      <Trash2 size={13} className="text-rose-400" />
                      <span>删除笔记</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Card Content Container with Collapsible Max Height & Gradient Mask ── */}
      <div className={`relative transition-all duration-200 ${isLongContent && !isExpanded ? "max-h-36 overflow-hidden" : ""}`}>
        {/* ── 2. High-Contrast Quote Block (清晰高对比划选原文，非斜体) ── */}
        {note.quote && (
          <div className={`mb-2 px-3 py-2 ${READING_TOKENS.surface.quote} select-text flex items-start gap-2`}>
            <Quote size={13} className="text-emerald-400 shrink-0 mt-0.5" />
            <span className={isExpanded ? "leading-relaxed" : "line-clamp-3 leading-relaxed"}>{note.quote}</span>
          </div>
        )}

        {/* ── 3. Direct Auto-Expanding Textarea (无内部滚动条，高度自适应伸展) ── */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "只读模式" : "记下感悟与思考..."}
            rows={1}
            className={`w-full bg-transparent ${READING_TOKENS.typography.body} placeholder:text-slate-500 focus:outline-none resize-none overflow-hidden leading-relaxed block ${
              isReadOnly ? "cursor-not-allowed" : ""
            }`}
          />

          {/* Auto-Save Status Badge */}
          {!isReadOnly && (
            <div className="flex justify-end items-center mt-0.5">
              {isSaved ? (
                <span className="flex items-center gap-1 opacity-50 text-[10px] text-slate-400 font-mono">
                  <CheckCircle2 size={10} className="text-emerald-400" />
                  已存
                </span>
              ) : (
                <span className="text-amber-400/90 flex items-center gap-1 animate-pulse text-[10px] font-mono">
                  <Edit3 size={10} />
                  保存中
                </span>
              )}
            </div>
          )}
        </div>

        {/* 渐变模糊遮罩 Gradient Masking (折叠时触发) */}
        {isLongContent && !isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/90 to-transparent pointer-events-none" />
        )}
      </div>

      {/* ── 4. Expand / Collapse Action Control (查看更多 / 收起) ── */}
      {isLongContent && (
        <div className="flex justify-center pt-1 mt-1 border-t border-slate-800/40">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer py-0.5 px-2 rounded-md hover:bg-cyan-500/10 font-medium"
          >
            <span>{isExpanded ? "收起笔记" : "查看更多"}</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      )}
    </motion.div>
  )
}
