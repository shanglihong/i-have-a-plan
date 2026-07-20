import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bookmark,
  PanelRightClose,
  Quote,
  X,
  Send,
  Search,
  Sparkles,
  Copy,
  Check,
  Zap,
  GripVertical,
  FolderTree,
  List,
  Square,
  RefreshCw,
  ThumbsUp,
  Plus,
  ArrowRight,
  HelpCircle,
} from "lucide-react"
import { UnifiedNoteCard, NoteCardData } from "./UnifiedNoteCard"
import { ChapterNoteTree } from "./ChapterNoteTree"
import { READING_TOKENS } from "../../../shared/constants"

export interface MessageItem {
  role: string
  content: string
  done: boolean
  quote: string | null
  taskRecommendation?: {
    title: string
    description: string
  }
}

interface CompanionDrawerProps {
  isOpen: boolean
  onClose: () => void
  is25InchPlus: boolean
  isLaptopOrSmaller?: boolean
  isReadOnly?: boolean
  activeTab: "copilot" | "notes"
  onTabChange: (tab: "copilot" | "notes") => void
  activeChapterId?: string
  // Chat Props
  messages: MessageItem[]
  streaming: boolean
  discussMsg: string
  setDiscussMsg: (msg: string) => void
  quotedContext: string | null
  setQuotedContext: (quote: string | null) => void
  onSendMessage: (promptText?: string) => void
  onStopStreaming?: () => void
  onRegenerateLast?: () => void
  onAddTaskToPlan?: (taskTitle: string) => void
  // Notes Props
  notes: NoteCardData[]
  noteSearch: string
  setNoteSearch: (search: string) => void
  onTraceNote: (anchor: string) => void
  onCreateNote: (data: { content: string; quote?: string; anchor: string }) => void
  onUpdateNote?: (noteId: string, newContent: string) => void
  onDeleteNote?: (noteId: string) => void
  onExtractSkill?: (scopeType: "L1" | "L2", data?: any) => void
}

const SMART_PROMPT_CHIPS = [
  { id: "chip1", label: "启发式领读本章", prompt: "请用结构化列表帮我领读本章的核心逻辑与重点。" },
  { id: "chip2", label: "分析 Sigmoid 梯度消失", prompt: "请定量推导 Sigmoid 激活函数的梯度消失过程及深层网络影响。" },
  { id: "chip3", label: "对比 BN 与 ResNet", prompt: "对比 Batch Normalization 与 ResNet 在解决梯度消失时的核心机制差异。" },
  { id: "chip4", label: "归纳考点与避坑卡片", prompt: "请总结本章在考试与面试中最常考的 3 个考点与避坑指南。" },
]

export function CompanionDrawer({
  isOpen,
  onClose,
  is25InchPlus,
  isLaptopOrSmaller = false,
  isReadOnly = false,
  activeTab,
  onTabChange,
  activeChapterId = "ch3",
  messages,
  streaming,
  discussMsg,
  setDiscussMsg,
  quotedContext,
  setQuotedContext,
  onSendMessage,
  onStopStreaming,
  onRegenerateLast,
  onAddTaskToPlan,
  notes,
  noteSearch,
  setNoteSearch,
  onTraceNote,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onExtractSkill,
}: CompanionDrawerProps) {
  const chatRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [noteSavedIndex, setNoteSavedIndex] = useState<number | null>(null)
  const [addedTaskIndex, setAddedTaskIndex] = useState<number | null>(null)
  const [likedIndex, setLikedIndex] = useState<number | null>(null)
  const [noteViewMode, setNoteViewMode] = useState<"tree" | "list">("tree")

  // 动态计算屏幕 1/3 约占宽度（笔记本屏 ~33% 约 420-480px，大屏/2K屏 ~33% 约 540-800px）
  const getOneThirdWidth = useCallback(() => {
    if (typeof window === "undefined") return 480
    const w = window.innerWidth
    return Math.min(800, Math.max(340, Math.round(w * 0.33)))
  }, [])

  const [calculatedDefaultWidth, setCalculatedDefaultWidth] = useState(getOneThirdWidth())
  const [customWidth, setCustomWidth] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setCalculatedDefaultWidth(getOneThirdWidth())
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [getOneThirdWidth])

  const currentWidth = customWidth ?? calculatedDefaultWidth

  useEffect(() => {
    setCustomWidth(null)
  }, [is25InchPlus, isLaptopOrSmaller])

  const startResizing = useCallback(
    (mouseDownEvent: React.MouseEvent) => {
      mouseDownEvent.preventDefault()
      setIsResizing(true)
      const startX = mouseDownEvent.clientX
      const startWidth = currentWidth

      const doDrag = (mouseMoveEvent: MouseEvent) => {
        const deltaX = startX - mouseMoveEvent.clientX
        const minW = 280
        const maxW = Math.min(960, Math.max(500, Math.round(window.innerWidth * 0.45)))
        const newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX))
        setCustomWidth(newWidth)
      }

      const stopDrag = () => {
        setIsResizing(false)
        window.removeEventListener("mousemove", doDrag)
        window.removeEventListener("mouseup", stopDrag)
      }

      window.addEventListener("mousemove", doDrag)
      window.addEventListener("mouseup", stopDrag)
    },
    [currentWidth, isLaptopOrSmaller],
  )

  useEffect(() => {
    if (chatRef.current && activeTab === "copilot") {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, streaming, activeTab])

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDiscussMsg(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(140, textareaRef.current.scrollHeight)}px`
    }
  }

  const copyMessageContent = (content: string, index: number) => {
    const plainText = content.replace(/<[^>]+>/g, "").replace(/\*\*(.*?)\*\*/g, "$1")
    navigator.clipboard.writeText(plainText)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const saveMessageAsNote = (msg: MessageItem, index: number) => {
    const plainContent = msg.content.replace(/<[^>]+>/g, "").replace(/\*\*(.*?)\*\*/g, "$1")
    onCreateNote({
      content: plainContent,
      quote: msg.quote || undefined,
      anchor: "第3章 · 反向传播算法",
    })
    setNoteSavedIndex(index)
    setTimeout(() => setNoteSavedIndex(null), 2000)
  }

  const handleAddTask = (title: string, index: number) => {
    onAddTaskToPlan?.(title)
    setAddedTaskIndex(index)
    setTimeout(() => setAddedTaskIndex(null), 2500)
  }

  // 格式化对话富文本排版（使用 READING_TOKENS 代替硬编码文本）
  const formatMessageHtml = (rawContent: string) => {
    const paragraphs = rawContent.split(/\n\n+/)
    return paragraphs
      .map((p) => {
        const formatted = p
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-100 tracking-tight px-0.5">$1</strong>')
          .replace(/`([^`]+)`/g, '<code class="font-mono text-xs sm:text-sm bg-[#131C2E] border border-cyan-500/30 px-1.5 py-0.5 rounded text-cyan-300 font-medium">$1</code>')
          .replace(/\n/g, "<br/>")
        return `<p class="mb-3 last:mb-0">${formatted}</p>`
      })
      .join("")
  }

  const filteredNotes = notes.filter(
    (n) =>
      n.content?.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.quote?.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.anchor?.toLowerCase().includes(noteSearch.toLowerCase()),
  )

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: currentWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={isResizing ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden shrink-0 bg-[#090D16] border-l border-slate-800/80 z-20 shadow-2xl flex flex-col relative select-none font-sans"
        >
          {/* Left Edge Resizer Drag Handle */}
          <div
            onMouseDown={startResizing}
            onDoubleClick={() => setCustomWidth(null)}
            title="按住左右拖动调节宽度，双击复位默认宽度"
            className={`absolute left-0 top-0 bottom-0 w-1.5 hover:w-2 z-30 cursor-col-resize group flex items-center justify-center transition-all ${
              isResizing ? "bg-cyan-500/40" : "hover:bg-cyan-500/20"
            }`}
          >
            <div className="h-10 w-1 rounded-full bg-slate-700/60 group-hover:bg-cyan-400 transition-colors flex items-center justify-center">
              <GripVertical size={10} className="text-slate-900 opacity-0 group-hover:opacity-100" />
            </div>
          </div>

          <div className="w-full h-full flex flex-col transition-all duration-200 pl-1.5">
            {/* ── Header Bar & Animated Tab Selector ── */}
            <div className="h-12 px-3.5 border-b border-slate-800/80 flex items-center justify-between bg-[#0C111D]/80 backdrop-blur-md shrink-0">
              <div className="grid grid-cols-2 gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800/90 shadow-inner w-[200px] sm:w-[230px] 2xl:w-[260px]">
                <button
                  onClick={() => onTabChange("copilot")}
                  className={`relative py-1.5 px-2 ${READING_TOKENS.typography.subtext} font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "copilot" ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {activeTab === "copilot" && (
                    <motion.div
                      layoutId="activeCompanionTab"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 shadow-xs z-0"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <Sparkles size={14} className={`relative z-10 ${activeTab === "copilot" ? "text-cyan-400" : "text-slate-400"}`} />
                  <span className="relative z-10 truncate">AI 伴读</span>
                </button>

                <button
                  onClick={() => onTabChange("notes")}
                  className={`relative py-1.5 px-2 ${READING_TOKENS.typography.subtext} font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "notes" ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {activeTab === "notes" && (
                    <motion.div
                      layoutId="activeCompanionTab"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 shadow-xs z-0"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <Bookmark size={14} className={`relative z-10 ${activeTab === "notes" ? "text-cyan-400" : "text-slate-400"}`} />
                  <span className="relative z-10 truncate">笔记 ({notes.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onExtractSkill?.("L2")}
                  disabled={isReadOnly}
                  className={`p-1.5 rounded-lg border transition-all ${
                    isReadOnly
                      ? "text-slate-600 border-transparent cursor-not-allowed"
                      : "text-violet-300 hover:text-violet-200 bg-violet-500/15 hover:bg-violet-500/25 border-violet-500/30 cursor-pointer"
                  }`}
                  title="一键提取本章精华方法论 (L2 汇总提炼)"
                >
                  <Zap size={15} className="text-violet-400" />
                </button>

                <button
                  onClick={onClose}
                  aria-label="关闭伴读栏"
                  title="关闭伴读与笔记栏 (Esc)"
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <PanelRightClose size={16} />
                </button>
              </div>
            </div>

            {/* ── TAB 1: AI COPILOT (DISCUSS) ── */}
            {activeTab === "copilot" && (
              <div className="flex-1 flex flex-col min-h-0 bg-[#090D16] relative font-sans">
                {/* Compact Prompt Chips Bar */}
                <div className="p-3 border-b border-slate-800/60 bg-[#0C111D]/40 shrink-0">
                  <div className={`flex items-center gap-1.5 ${READING_TOKENS.typography.subtext} font-medium mb-2`}>
                    <HelpCircle size={13} className="text-cyan-400" />
                    <span>本章启发提问</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SMART_PROMPT_CHIPS.map((chip) => (
                      <button
                        key={chip.id}
                        onClick={() => !isReadOnly && !streaming && onSendMessage(chip.prompt)}
                        disabled={isReadOnly || streaming}
                        className={READING_TOKENS.surface.promptChip}
                      >
                        <span>{chip.label}</span>
                        <ArrowRight size={11} className="text-cyan-400/80" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Messages Stream with Standardized READING_TOKENS Typography */}
                <div
                  ref={chatRef}
                  className="flex-1 overflow-y-auto p-4 2xl:p-6 space-y-4.5 scrollbar-thin scrollbar-thumb-slate-800/80"
                >
                  {messages.map((msg, index) => {
                    const isUser = msg.role === "user"
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isUser ? "justify-end" : "justify-start w-full"}`}
                      >
                        <div className={`flex flex-col ${isUser ? "max-w-[82%] items-end" : "w-full items-start"}`}>
                          {/* Quote Context Box */}
                          {msg.quote && (
                            <div className={`mb-2 px-3 py-1.5 ${READING_TOKENS.surface.quote} flex items-center gap-1.5 shadow-xs leading-relaxed`}>
                              <Quote size={12} className="shrink-0 text-emerald-400" />
                              <span className="truncate">{msg.quote}</span>
                            </div>
                          )}

                          {/* Message Content Bubble with Unified Token Styles */}
                          <div
                            className={`p-4 ${READING_TOKENS.typography.body} ${
                              isUser ? READING_TOKENS.surface.userBubble : READING_TOKENS.surface.card
                            }`}
                          >
                            <div
                              dangerouslySetInnerHTML={{
                                __html: formatMessageHtml(msg.content),
                              }}
                            />
                            {!msg.done && (
                              <span className="inline-block w-1.5 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
                            )}
                          </div>

                          {/* Inline Task Recommendation Card */}
                          {!isUser && msg.done && index === messages.length - 1 && (
                            <div className="w-full mt-3 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 hover:border-cyan-500/50 flex items-center justify-between gap-3 shadow-xs transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Sparkles size={14} className="text-cyan-400 shrink-0" />
                                <div className="min-w-0">
                                  <div className={`font-bold text-cyan-200 truncate ${READING_TOKENS.typography.subtext}`}>
                                    推荐实践：反向传播与链式求导公式复现
                                  </div>
                                  <div className={`truncate ${READING_TOKENS.typography.meta}`}>
                                    将本章方法论内化加入计划项目 Task 树
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAddTask("反向传播与链式求导公式复现", index)}
                                className="px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1"
                              >
                                <Plus size={12} />
                                <span>{addedTaskIndex === index ? "已加入" : "加入计划"}</span>
                              </button>
                            </div>
                          )}

                          {/* Assistant Action Toolbar */}
                          {!isUser && msg.done && (
                            <div className="flex items-center gap-4 mt-2 px-1 text-xs font-sans">
                              <button
                                onClick={() => copyMessageContent(msg.content, index)}
                                className={READING_TOKENS.typography.action}
                              >
                                {copiedIndex === index ? (
                                  <Check size={12} className="text-emerald-400" />
                                ) : (
                                  <Copy size={12} />
                                )}
                                <span>复制</span>
                              </button>

                              <button
                                onClick={() => saveMessageAsNote(msg, index)}
                                className={`${READING_TOKENS.typography.action} hover:text-cyan-300`}
                                title="一键存为融合笔记卡片"
                              >
                                {noteSavedIndex === index ? (
                                  <Check size={12} className="text-emerald-400" />
                                ) : (
                                  <Bookmark size={12} className="text-cyan-400" />
                                )}
                                <span>存为笔记</span>
                              </button>

                              <button
                                onClick={() => onRegenerateLast?.()}
                                className={READING_TOKENS.typography.action}
                                title="重新生成此回答"
                              >
                                <RefreshCw size={11} />
                                <span>重试</span>
                              </button>

                              <button
                                onClick={() => setLikedIndex(likedIndex === index ? null : index)}
                                className={`transition-colors cursor-pointer p-0.5 ${
                                  likedIndex === index ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                                }`}
                                title="赞"
                              >
                                <ThumbsUp size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Multiline Input Area */}
                <div className="p-3.5 border-t border-slate-800/80 bg-[#0C111D]/90 backdrop-blur-md shrink-0 space-y-2">
                  {quotedContext && (
                    <div className={`px-3 py-2 ${READING_TOKENS.surface.quote} flex items-center justify-between gap-2`}>
                      <div className="flex items-center gap-1.5 min-w-0 italic">
                        <Quote size={13} className="shrink-0 text-emerald-400" />
                        <span className="truncate">{quotedContext}</span>
                      </div>
                      <button
                        onClick={() => setQuotedContext(null)}
                        className="text-emerald-400 hover:text-emerald-100 cursor-pointer p-0.5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="bg-[#0F172A] border border-slate-800 focus-within:border-cyan-500/60 rounded-2xl p-3 transition-all flex flex-col gap-2 shadow-inner">
                    <textarea
                      ref={textareaRef}
                      value={discussMsg}
                      onChange={handleTextareaInput}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          onSendMessage()
                        }
                      }}
                      disabled={isReadOnly || streaming}
                      rows={1}
                      placeholder={isReadOnly ? "只读模式" : "向 AI 伴读提问或探索核心逻辑..."}
                      className={`w-full bg-transparent ${READING_TOKENS.typography.body} placeholder:text-slate-500 focus:outline-none resize-none`}
                    />

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60">
                      <span className={READING_TOKENS.typography.meta}>
                        Enter 发送 · Shift+Enter 换行
                      </span>

                      {/* Send / Stop Generation Toggle Button */}
                      {streaming ? (
                        <button
                          onClick={onStopStreaming}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-all cursor-pointer font-medium flex items-center gap-1 shadow-xs animate-pulse text-xs"
                        >
                          <Square size={12} className="fill-rose-400" />
                          <span>停止生成</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onSendMessage()}
                          disabled={isReadOnly || !discussMsg.trim()}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer font-semibold shrink-0"
                          title="发送消息"
                        >
                          <Send size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: UNIFIED NOTES (WITH TREE / STREAM VIEW MODES) ── */}
            {activeTab === "notes" && (
              <div className="flex-1 flex flex-col min-h-0 bg-[#090D16] font-sans">
                {/* Search Header & View Mode Switcher */}
                <div className="p-3.5 border-b border-slate-800/80 bg-[#0C111D]/50 shrink-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 text-xs">
                      <button
                        onClick={() => setNoteViewMode("tree")}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                          noteViewMode === "tree"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <FolderTree size={13} />
                        <span>章节树</span>
                      </button>

                      <button
                        onClick={() => setNoteViewMode("list")}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                          noteViewMode === "list"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <List size={13} />
                        <span>时间流</span>
                      </button>
                    </div>

                    <div className="relative flex-1">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={noteSearch}
                        onChange={(e) => setNoteSearch(e.target.value)}
                        placeholder="搜索笔记..."
                        className={`w-full bg-[#0F172A] border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 ${READING_TOKENS.typography.subtext} placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50`}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes Stream Body */}
                <div className="flex-1 overflow-y-auto p-3.5 2xl:p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-800/80">
                  {noteViewMode === "tree" ? (
                    <ChapterNoteTree
                      notes={filteredNotes}
                      activeChapterId={activeChapterId}
                      isReadOnly={isReadOnly}
                      onTraceAnchor={onTraceNote}
                      onUpdateNote={onUpdateNote}
                      onDeleteNote={onDeleteNote}
                      onExtractSkill={(n) => onExtractSkill?.("L1", n)}
                    />
                  ) : filteredNotes.length === 0 ? (
                    <div className="py-12 text-center text-xs sm:text-sm text-slate-500 flex flex-col items-center gap-2 font-sans">
                      <Bookmark size={26} className="text-slate-700" />
                      <span>暂无相关精读笔记，划选正文可快速添加</span>
                    </div>
                  ) : (
                    <div className="relative pl-3.5 space-y-3.5 border-l border-slate-800/80 ml-2 my-1">
                      {filteredNotes.map((note) => (
                        <div key={note.id} className="relative">
                          {/* Timeline Node Indicator */}
                          <div className="absolute -left-[19px] top-4 w-2 h-2 rounded-full bg-cyan-500/60 border border-cyan-400/80 shadow-xs ring-4 ring-[#090D16]" />
                          <UnifiedNoteCard
                            note={note}
                            isReadOnly={isReadOnly}
                            onTraceAnchor={onTraceNote}
                            onUpdateNote={onUpdateNote}
                            onDeleteNote={onDeleteNote}
                            onExtractSkill={(n) => onExtractSkill?.("L1", n)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
