import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bookmark,
  PanelRightClose,
  Quote,
  X,
  Send,
  Search,
  Target,
  Plus,
  Sparkles,
  Bot,
  Copy,
  Check,
  Zap,
  Lightbulb,
  BookOpen,
  GripVertical,
} from "lucide-react"

export interface MessageItem {
  role: string
  content: string
  done: boolean
  quote: string | null
}

export interface NoteItem {
  id: string
  anchor: string
  quote?: string
  content: string
  createdAt: string
}

interface CompanionDrawerProps {
  isOpen: boolean
  onClose: () => void
  is25InchPlus: boolean
  isLaptopOrSmaller?: boolean
  activeTab: "copilot" | "notes"
  onTabChange: (tab: "copilot" | "notes") => void
  // Chat Props
  messages: MessageItem[]
  streaming: boolean
  discussMsg: string
  setDiscussMsg: (msg: string) => void
  quotedContext: string | null
  setQuotedContext: (quote: string | null) => void
  onSendMessage: (promptText?: string) => void
  // Notes Props
  notes: NoteItem[]
  noteSearch: string
  setNoteSearch: (search: string) => void
  onTraceNote: (anchor: string) => void
  onCreateNote: (data: { content: string; quote?: string; anchor: string }) => void
}

export function CompanionDrawer({
  isOpen,
  onClose,
  is25InchPlus,
  isLaptopOrSmaller = false,
  activeTab,
  onTabChange,
  messages,
  streaming,
  discussMsg,
  setDiscussMsg,
  quotedContext,
  setQuotedContext,
  onSendMessage,
  notes,
  noteSearch,
  setNoteSearch,
  onTraceNote,
  onCreateNote,
}: CompanionDrawerProps) {
  const chatRef = useRef<HTMLDivElement>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [noteSavedIndex, setNoteSavedIndex] = useState<number | null>(null)

  // 默认自适应基准宽度：25"+ (420px), 13"/14" Mac (260px), Standard 1536-1920 (320px)
  const defaultWidth = is25InchPlus ? 420 : isLaptopOrSmaller ? 260 : 320
  const [customWidth, setCustomWidth] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  const currentWidth = customWidth ?? defaultWidth

  // 当屏幕配置发生变化时重置自定义宽度
  useEffect(() => {
    setCustomWidth(null)
  }, [is25InchPlus, isLaptopOrSmaller])

  // 拖拽手柄 Handler (13" Mac: 220~380px | 标准屏: 260~480px)
  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault()
    setIsResizing(true)
    const startX = mouseDownEvent.clientX
    const startWidth = currentWidth

    const doDrag = (mouseMoveEvent: MouseEvent) => {
      const deltaX = startX - mouseMoveEvent.clientX
      const minW = isLaptopOrSmaller ? 220 : 260
      const maxW = isLaptopOrSmaller ? 380 : 480
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
  }, [currentWidth, isLaptopOrSmaller])

  // 自动滚动到聊天底部
  useEffect(() => {
    if (chatRef.current && activeTab === "copilot") {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, streaming, activeTab])

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
          className="overflow-hidden shrink-0 bg-[#0C111D] border-l border-slate-800/80 z-20 shadow-2xl flex flex-col relative select-none"
        >
          {/* Left Edge Resizer Drag Handle */}
          <div
            onMouseDown={startResizing}
            onDoubleClick={() => setCustomWidth(null)}
            title="按住左右拖动调节宽度，双击复位默认宽度"
            className={`absolute left-0 top-0 bottom-0 w-1.5 hover:w-2 z-30 cursor-col-resize group flex items-center justify-center transition-all ${isResizing ? "bg-cyan-500/40" : "hover:bg-cyan-500/20"
              }`}
          >
            <div className="h-10 w-1 rounded-full bg-slate-700/60 group-hover:bg-cyan-400 transition-colors flex items-center justify-center">
              <GripVertical size={10} className="text-slate-900 opacity-0 group-hover:opacity-100" />
            </div>
          </div>

          <div className="w-full h-full flex flex-col transition-all duration-200 pl-2">
            {/* ── Header Bar & Animated Tab Selector ── */}
            <div className="h-12 px-3 border-b border-slate-800/80 flex items-center justify-between bg-[#090D16]/60 backdrop-blur-md shrink-0">
              <div className="flex relative bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 shadow-inner">
                {/* Sliding Pill Indicator */}
                <motion.div
                  className="absolute inset-y-1 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 shadow-sm"
                  initial={false}
                  animate={{
                    x: activeTab === "copilot" ? 0 : "100%",
                    width: "50%",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />

                <button
                  onClick={() => onTabChange("copilot")}
                  className={`relative z-10 px-2.5 2xl:px-4 py-1.5 text-xs 2xl:text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "copilot" ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <Sparkles size={13} className={activeTab === "copilot" ? "text-cyan-400" : "text-slate-400"} />
                  <span>AI 伴读</span>
                </button>

                <button
                  onClick={() => onTabChange("notes")}
                  className={`relative z-10 px-2.5 2xl:px-4 py-1.5 text-xs 2xl:text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "notes" ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <Bookmark size={13} className={activeTab === "notes" ? "text-cyan-400" : "text-slate-400"} />
                  <span>笔记 ({notes.length})</span>
                </button>
              </div>

              <button
                onClick={onClose}
                aria-label="关闭伴读栏"
                title="关闭伴读与笔记栏 (Esc)"
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <PanelRightClose size={16} />
              </button>
            </div>

            {/* ── TAB 1: AI COPILOT ── */}
            {activeTab === "copilot" && (
              <div className="flex-1 flex flex-col min-h-0 bg-[#090D16]/30">
                {/* Chat Messages Body */}
                <div
                  ref={chatRef}
                  className="flex-1 overflow-y-auto p-3 2xl:p-5 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800/80"
                >
                  {messages.map((msg, index) => {
                    const isUser = msg.role === "user"
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {/* Avatar */}
                        {!isUser && (
                          <div className="w-6 h-6 2xl:w-8 2xl:h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 shadow-sm mt-0.5">
                            <Bot size={14} />
                          </div>
                        )}

                        <div className={`flex flex-col max-w-[88%] 2xl:max-w-[90%] ${isUser ? "items-end" : "items-start"}`}>
                          {/* Quote Box */}
                          {msg.quote && (
                            <div className="mb-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs 2xl:text-sm text-emerald-300 flex items-center gap-1.5 italic shadow-sm">
                              <Quote size={12} className="shrink-0 text-emerald-400" />
                              <span className="truncate">{msg.quote}</span>
                            </div>
                          )}

                          {/* Message Content Bubble */}
                          <div
                            className={`group relative rounded-2xl px-3.5 py-2.5 text-xs 2xl:text-sm leading-relaxed ${isUser
                              ? "bg-gradient-to-r from-cyan-600/30 to-blue-600/20 text-cyan-100 border border-cyan-500/40 rounded-tr-sm shadow-md"
                              : "bg-[#111827] border border-slate-800 text-slate-200 rounded-tl-sm shadow-md"
                              }`}
                          >
                            <div
                              dangerouslySetInnerHTML={{
                                __html: msg.content
                                  .replace(/\n\n/g, "<br/><br/>")
                                  .replace(
                                    /\*\*(.*?)\*\*/g,
                                    '<strong class="text-cyan-300 font-semibold">$1</strong>',
                                  ),
                              }}
                            />
                            {!msg.done && (
                              <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle rounded-xs" />
                            )}

                            {/* Message Hover Actions (AI Assistant only) */}
                            {!isUser && msg.done && (
                              <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => copyMessageContent(msg.content, index)}
                                  className="text-xs 2xl:text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 hover:bg-slate-800/60 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                  title="复制此回答"
                                >
                                  {copiedIndex === index ? (
                                    <>
                                      <Check size={11} className="text-emerald-400" />
                                      <span className="text-emerald-400">已复制</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={11} />
                                      <span>复制</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => saveMessageAsNote(msg, index)}
                                  className="text-xs 2xl:text-xs text-slate-400 hover:text-emerald-300 flex items-center gap-1 hover:bg-slate-800/60 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                  title="保存此回答为笔记"
                                >
                                  {noteSavedIndex === index ? (
                                    <>
                                      <Check size={11} className="text-emerald-400" />
                                      <span className="text-emerald-400">已转为笔记</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bookmark size={11} />
                                      <span>存为笔记</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Quoted Preview Banner */}
                <AnimatePresence>
                  {quotedContext && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-3 py-1.5 bg-emerald-950/40 border-t border-emerald-500/40 flex items-center justify-between text-xs 2xl:text-xs text-emerald-300"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <Quote size={12} className="shrink-0 text-emerald-400" />
                        <span className="truncate">引用："{quotedContext}"</span>
                      </div>
                      <button
                        onClick={() => setQuotedContext(null)}
                        className="text-slate-400 hover:text-slate-100 p-0.5 rounded hover:bg-slate-800/60 cursor-pointer"
                        title="取消引用"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quick Prompts Bar (No Emoji, Vector Icons Only) */}
                <div className="px-2.5 2xl:px-4 py-1.5 border-t border-slate-800/60 bg-[#0C111D]/90 flex gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => onSendMessage("请用简单比喻解释链式法则的核心思想？")}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 hover:border-cyan-500/40 whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Lightbulb size={11} className="text-amber-400" />
                    <span>链式法则比喻</span>
                  </button>
                  <button
                    onClick={() => onSendMessage("梯度消失现象的深层根源及公式推导是怎样的？")}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 hover:border-cyan-500/40 whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Zap size={11} className="text-cyan-400" />
                    <span>梯度消失剖析</span>
                  </button>
                  <button
                    onClick={() => onSendMessage("ResNet 残差网络如何解决深层梯度衰减问题？")}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 hover:border-cyan-500/40 whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <BookOpen size={11} className="text-violet-400" />
                    <span>ResNet残差机制</span>
                  </button>
                </div>

                {/* Message Input Container */}
                <div className="p-2.5 2xl:p-4 border-t border-slate-800/80 bg-[#090D16]">
                  <div className="flex gap-2">
                    <input
                      value={discussMsg}
                      onChange={(e) => setDiscussMsg(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !streaming && onSendMessage()}
                      placeholder={quotedContext ? "基于引用提问…" : "向伴读 AI 提问…"}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs 2xl:text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
                    />
                    <button
                      onClick={() => onSendMessage()}
                      disabled={streaming || !discussMsg.trim()}
                      aria-label="发送消息"
                      className="w-8 h-8 2xl:w-10 2xl:h-10 flex items-center justify-center rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-sm"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: NOTES WATERFALL ── */}
            {activeTab === "notes" && (
              <div className="flex-1 flex flex-col min-h-0 bg-[#090D16]/30 p-3 2xl:p-4 space-y-3">
                {/* Search Notes Input */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    placeholder="搜索笔记关键词、引用与锚点..."
                    className="w-full bg-slate-950 border border-slate-800/90 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition-all font-sans"
                  />
                </div>

                {/* Notes List Waterfall */}
                <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-800/80 pr-1">
                  {filteredNotes.map((note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#111827] border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-3.5 shadow-md transition-all group"
                    >
                      {/* Anchor & Time Tag */}
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => onTraceNote(note.anchor)}
                          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer font-semibold"
                          title="点击跳转到正文锚点"
                        >
                          <Target size={12} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                          <span>{note.anchor}</span>
                        </button>
                        <span className="text-xs text-slate-500 font-mono">{note.createdAt}</span>
                      </div>

                      {/* Quote Container if present */}
                      {note.quote && (
                        <blockquote className="text-xs 2xl:text-xs text-emerald-300 bg-emerald-950/30 px-2.5 py-1.5 rounded-xl mb-2 italic leading-relaxed border-l-2 border-emerald-500/60 font-sans">
                          "{note.quote}"
                        </blockquote>
                      )}

                      {/* Note Body Text */}
                      <p
                        className="text-xs 2xl:text-sm text-slate-300 leading-relaxed font-sans"
                        dangerouslySetInnerHTML={{
                          __html: note.content.replace(
                            /\*\*(.*?)\*\*/g,
                            '<strong class="text-slate-100 font-semibold">$1</strong>',
                          ),
                        }}
                      />
                    </motion.div>
                  ))}

                  {/* Add Note Button */}
                  <button
                    onClick={() =>
                      onCreateNote({
                        content: "新建精读思考与总结笔记...",
                        anchor: "第3章 · 反向传播算法",
                      })
                    }
                    className="w-full py-2.5 text-xs text-slate-400 hover:text-cyan-300 border border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer font-semibold bg-slate-950/40 hover:bg-slate-900/80 shadow-sm"
                  >
                    <Plus size={14} className="text-cyan-400" />
                    <span>新建灵感笔记</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
