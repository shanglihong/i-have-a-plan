import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Quote,
  MapPin,
  Sparkles,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { READING_TOKENS } from "../../shared/constants"
import { cn } from "../../shared/utils/cn"

function formatTimeToSeconds(timeStr?: string): string {
  if (!timeStr) return ""
  try {
    const date = new Date(timeStr)
    if (!isNaN(date.getTime())) {
      const pad = (n: number) => n.toString().padStart(2, "0")
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
        date.getHours()
      )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }
  } catch {
    // ignore
  }
  return timeStr.replace("T", " ").replace(/\.\d+.*$/, "")
}

export interface NoteCardData {
  id: string
  anchor: string
  quote?: string
  content: string
  createdAt?: string
  sourceAnchor?: {
    book_id: string
    chapter_id: string
    start_offset: number
    end_offset: number
    feature_text: string
  }
}

interface UnifiedNoteCardProps {
  note: NoteCardData
  isReadOnly?: boolean
  onTraceAnchor: (anchor: string, sourceAnchor?: NoteCardData["sourceAnchor"]) => void
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
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 无滚动条 Auto-Growing Textarea 高度自适应
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
    }, 1500)
  }

  const handleBlur = () => {
    if (isReadOnly || isSaved) return
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    onUpdateNote?.(note.id, content)
    setIsSaved(true)
  }

  const handleCopy = () => {
    const textToCopy = note.quote ? `引文：${note.quote}\n\n思考：${content}` : content
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 计算是否属于超长需要折叠的笔记
  const isLongContent = (note.quote?.length || 0) + content.length > 110

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isReadOnly ? 0.65 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      onMouseLeave={() => {
        setShowDeleteConfirm(false)
      }}
      className={cn(
        "group p-3 relative font-sans",
        READING_TOKENS.surface.hoverCard,
        isReadOnly && "opacity-65 cursor-not-allowed"
      )}
    >
      {/* ── 1. Card Header: Time Meta + [复制 / 定位 / 删除] Actions ── */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {note.createdAt && (
            <span className={cn(READING_TOKENS.typography.meta, "inline-flex items-center gap-1 shrink-0")}>
              <Clock size={11} />
              {formatTimeToSeconds(note.createdAt)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* 1. 复制图标 */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-cyan-300 bg-slate-800/40 hover:bg-cyan-500/15 border border-slate-700/60 hover:border-cyan-500/40 rounded-lg transition-all cursor-pointer shadow-xs group flex items-center justify-center"
            title={copied ? "已复制" : "复制引文与思考"}
            aria-label="复制笔记"
          >
            {copied ? (
              <Check size={13} className="text-emerald-400 scale-110 transition-transform" />
            ) : (
              <Copy size={13} className="group-hover:scale-110 transition-transform" />
            )}
          </button>

          {/* 2. 原文定位图标 (基于 source_anchor 与划词原文 quote) */}
          <button
            onClick={() => {
              const traceTarget = note.quote || note.anchor
              if (traceTarget || note.sourceAnchor) {
                onTraceAnchor(traceTarget, note.sourceAnchor)
              }
            }}
            className="p-1.5 text-cyan-400 hover:text-cyan-200 bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/35 hover:border-cyan-400/70 rounded-lg transition-all cursor-pointer shadow-xs group flex items-center justify-center"
            title="定位引文至原文段落"
            aria-label="定位引文至原文段落"
          >
            <MapPin size={13} className="group-hover:scale-110 transition-transform" />
          </button>

          {/* 3. 提炼技能图标 (如有) */}
          {onExtractSkill && (
            <button
              onClick={() => onExtractSkill(note)}
              className="p-1.5 text-violet-400 hover:text-violet-200 bg-violet-500/15 hover:bg-violet-500/30 border border-violet-500/35 hover:border-violet-400/70 rounded-lg transition-all cursor-pointer shadow-xs group flex items-center justify-center"
              title="提炼技能 (L1)"
              aria-label="提炼技能"
            >
              <Sparkles size={13} className="group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* 4. 删除图标与悬浮微型确认 Popover */}
          {!isReadOnly && (
            <div className="relative">
              <button
                onClick={() => setShowDeleteConfirm((prev) => !prev)}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer shadow-xs group flex items-center justify-center border",
                  showDeleteConfirm
                    ? "text-rose-200 bg-rose-500/30 border-rose-500/60"
                    : "text-rose-400 hover:text-rose-200 bg-rose-500/15 hover:bg-rose-500/30 border-rose-500/35 hover:border-rose-400/70"
                )}
                title="删除笔记"
                aria-label="删除笔记"
              >
                <Trash2 size={13} className="group-hover:scale-110 transition-transform" />
              </button>

              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1.5 z-30 flex items-center gap-1 p-1 bg-[#0F172A] border border-rose-500/40 rounded-lg shadow-xl backdrop-blur-md whitespace-nowrap"
                  >
                    <button
                      onClick={() => {
                        onDeleteNote?.(note.id)
                        setShowDeleteConfirm(false)
                      }}
                      className="px-2 py-0.5 text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-medium rounded transition-colors cursor-pointer shadow-xs"
                    >
                      确认
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── Card Content Container with Collapsible Max Height & Gradient Mask ── */}
      <div className={cn("relative transition-all duration-200", isLongContent && !isExpanded && "max-h-36 overflow-hidden")}>
        {/* ── 2. High-Contrast Quote Block (Warm Amber Accent) ── */}
        {note.quote && (
          <div className={cn("mb-2 px-3 py-2 select-text flex items-start gap-2", READING_TOKENS.surface.quote)}>
            <Quote size={13} className="text-amber-400 shrink-0 mt-0.5" />
            <span className={cn(isExpanded ? "leading-relaxed" : "line-clamp-3 leading-relaxed")}>{note.quote}</span>
          </div>
        )}

        {/* ── 3. Direct Auto-Expanding Textarea ── */}
        <div className={cn("relative p-2.5 my-1", READING_TOKENS.surface.inputWrapper)}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onBlur={handleBlur}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "只读模式" : "记下感悟与思考..."}
            rows={1}
            style={{ outline: "none", boxShadow: "none" }}
            className={cn(
              "w-full resize-none overflow-hidden leading-relaxed block border-none",
              READING_TOKENS.surface.inputControl,
              READING_TOKENS.typography.body,
              isReadOnly && "cursor-not-allowed"
            )}
          />

          {/* Auto-Save Status Badge */}
          {!isReadOnly && (
            <div className="flex justify-end items-center mt-1.5 pt-1 border-t border-slate-800/60">
              {isSaved ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  已保存
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 font-medium px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 animate-pulse">
                  <Edit3 size={12} className="text-amber-300 shrink-0" />
                  保存中...
                </span>
              )}
            </div>
          )}
        </div>

        {/* 渐变模糊遮罩 Gradient Masking */}
        {isLongContent && !isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/90 to-transparent pointer-events-none" />
        )}
      </div>

      {/* ── 4. Expand / Collapse Action Control ── */}
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
