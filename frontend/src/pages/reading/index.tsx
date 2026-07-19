import { useParams } from "react-router-dom"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../shared/api"
import {
  useLayoutStore,
  useFocusStore,
  useFloatingMenuStore,
} from "../../shared/store"

import {
  ChevronRight,
  Minus,
  X,
  Send,
  Bookmark,
  Plus,
  Circle,
  CheckCircle2,
  Sparkles,
  Target,
  MessageSquare,
} from "lucide-react"

import { StatusBadge, ProgressBar } from "../../shared/ui"

// ─── Reading Workspace Page ────────────────────────────────────────────────────────

export default function ReadingWorkspacePage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [activeChapter, setActiveChapter] = useState("ch3")

  const outlineOpen = useLayoutStore((s) => s.outlineOpen)
  const setOutlineOpen = useLayoutStore((s) => s.setOutlineOpen)
  const discussOpen = useLayoutStore((s) => s.discussOpen)
  const setDiscussOpen = useLayoutStore((s) => s.setDiscussOpen)

  const targetAnchor = useFocusStore((s) => s.targetAnchor)
  const setTargetAnchor = useFocusStore((s) => s.setTargetAnchor)

  const floatingMenu = useFloatingMenuStore((s) => s.menu)
  const setFloatingMenu = useFloatingMenuStore((s) => s.setMenu)

  const [discussMsg, setDiscussMsg] = useState("")
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "你好！我已深度阅读本章内容。关于**反向传播算法**与**链式法则**，你有任何想探讨的疑难点吗？",
      done: true,
    },
  ])
  const [streaming, setStreaming] = useState(false)
  const [showBubble, setShowBubble] = useState(false)
  const readerRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  // 键盘 Escape 响应
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFloatingMenu(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setFloatingMenu])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const { data: notesData } = useQuery({
    queryKey: ["project-notes", id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}/notes`)
      return res.data
    },
  })
  const notes = notesData?.items || []

  const createNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post(`/notes`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-notes", id] })
    },
  })

  const chapters = [
    { id: "ch1", label: "第1章：感知机与历史", level: 0, done: true },
    { id: "ch2", label: "第2章：多层网络", level: 0, done: true },
    { id: "ch3", label: "第3章：反向传播", level: 0, active: true },
    { id: "ch3-1", label: "3.1 链式法则推导", level: 1 },
    { id: "ch3-2", label: "3.2 梯度消失分析", level: 1 },
    { id: "ch3-3", label: "3.3 BatchNorm 缓解", level: 1 },
    { id: "ch4", label: "第4章：卷积网络", level: 0 },
    { id: "ch5", label: "第5章：注意力与Transformer", level: 0 },
  ]

  useEffect(() => {
    if (targetAnchor && readerRef.current) {
      const elements = Array.from(
        readerRef.current.querySelectorAll("h1, h2, p, div"),
      )
      const targetEl = elements.find((el) =>
        el.textContent?.includes(
          targetAnchor.split(" · ")[1] || targetAnchor,
        ),
      )
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [targetAnchor])

  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) {
      setFloatingMenu(null)
      return
    }
    const text = sel.toString().trim()
    if (!text) {
      setFloatingMenu(null)
      return
    }
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = readerRef.current?.getBoundingClientRect()
    if (!containerRect) return
    setFloatingMenu({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      text,
    })
  }, [setFloatingMenu])

  const sendMessage = () => {
    if (!discussMsg.trim()) return
    const userMsg = discussMsg
    setDiscussMsg("")
    setMessages((m) => [...m, { role: "user", content: userMsg, done: true }])
    setStreaming(true)

    const reply =
      "这是一个很好的问题。**反向传播算法**的核心是利用链式求导法则，将输出层的误差信号逐层传递回输入层。关键在于：每一层的梯度都是当前层局部梯度与后续层梯度的乘积。当激活函数（如 Sigmoid）的导数区间在 (0, 0.25) 时，多层连乘后梯度会指数级缩小，这就是**梯度消失**的根源。"
    let i = 0
    setMessages((m) => [...m, { role: "assistant", content: "", done: false }])
    const interval = setInterval(() => {
      i += 3
      setMessages((m) => {
        const last = [...m]
        last[last.length - 1] = {
          role: "assistant",
          content: reply.slice(0, i),
          done: false,
        }
        return last
      })
      if (i >= reply.length) {
        clearInterval(interval)
        setStreaming(false)
        setMessages((m) => {
          const last = [...m]
          last[last.length - 1].done = true
          return last
        })
      }
    }, 30)
  }

  const traceNote = (noteAnchor: string) => {
    setTargetAnchor(noteAnchor)
    setTimeout(() => setTargetAnchor(null), 2000)
  }

  const handleScroll = useCallback(() => {
    if (!readerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = readerRef.current
    setShowBubble((scrollTop + clientHeight) / scrollHeight >= 0.7)
  }, [])

  return (
    <div className="h-full flex overflow-hidden bg-[#090d16] text-slate-100">
      {/* Left Chapter Outline Sidebar */}
      <AnimatePresence initial={false}>
        {outlineOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 230, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-white/10 bg-[#0c111d] shrink-0"
          >
            <div className="w-[230px] h-full flex flex-col">
              <div className="p-3.5 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200">
                    深度学习基础理论精读
                  </span>
                  <button
                    onClick={() => setOutlineOpen(false)}
                    aria-label="收起目录"
                    className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-white/10 cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>
                </div>
                {/* Progress bar */}
                <div className="mt-3 space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>阅读进度</span>
                      <span className="font-mono text-cyan-400 font-semibold">68%</span>
                    </div>
                    <ProgressBar value={68} color="cyan" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>切片解析</span>
                      <span className="font-mono text-violet-400 font-semibold">82%</span>
                    </div>
                    <ProgressBar value={82} color="violet" />
                  </div>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChapter(ch.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer
                      ${activeChapter === ch.id ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}
                      ${ch.level === 1 ? "ml-3 text-[11px]" : ""}`}
                  >
                    {ch.done ? (
                      <CheckCircle2
                        size={12}
                        className="text-emerald-400 shrink-0"
                      />
                    ) : ch.active ? (
                      <Circle
                        size={12}
                        className="text-cyan-400 shrink-0"
                      />
                    ) : (
                      <Circle
                        size={12}
                        className="text-slate-600 shrink-0"
                      />
                    )}
                    <span className="leading-snug truncate">
                      {ch.label}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Center Reader Area */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/10 overflow-hidden relative">
        {!outlineOpen && (
          <button
            onClick={() => setOutlineOpen(true)}
            aria-label="展开目录"
            className="absolute left-3 top-3 z-10 p-2 bg-[#111827] border border-white/10 rounded-lg text-slate-300 hover:text-slate-100 transition-all cursor-pointer shadow-lg"
          >
            <ChevronRight size={16} />
          </button>
        )}

        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3 shrink-0 bg-[#0c111d]">
          <span className="text-xs font-semibold text-slate-200">
            第3章 · 反向传播算法
          </span>
          <div className="flex-1" />
          <span className="text-xs font-mono text-slate-400">
            预计耗时 ~24 min
          </span>
          <StatusBadge status="ACTIVE" />
        </div>

        <div
          ref={readerRef}
          className="flex-1 overflow-y-auto px-8 py-8 relative"
          onMouseUp={handleTextSelect}
          onScroll={handleScroll}
        >
          {/* Floating Text Selection Menu */}
          <AnimatePresence>
            {floatingMenu && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.12 }}
                className="absolute z-40 bg-[#151d2a] border border-slate-700 rounded-xl shadow-2xl px-1.5 py-1 flex items-center gap-1"
                style={{
                  left: floatingMenu.x - 70,
                  top: floatingMenu.y - 48,
                }}
              >
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-200 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-lg transition-all cursor-pointer font-medium"
                  onClick={() => setFloatingMenu(null)}
                >
                  <MessageSquare size={13} /> 讨论
                </button>
                <div className="w-px h-4 bg-white/15" />
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-200 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-all cursor-pointer font-medium"
                  onClick={() => {
                    createNoteMutation.mutate({
                      content: floatingMenu.text,
                      anchor: "当前选中内容",
                    })
                    setFloatingMenu(null)
                  }}
                >
                  <Bookmark size={13} /> 记笔记
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Article Main Body */}
          <article className="max-w-[660px] mx-auto">
            <h1 className="text-2xl font-bold text-slate-100 mb-2 tracking-wide">
              第三章：反向传播算法
            </h1>
            <p className="text-xs text-slate-400 mb-6 font-mono border-b border-white/10 pb-3">
              深度学习基础理论精读 · Chapter 3
            </p>

            <p className="text-sm text-slate-200 leading-relaxed mb-5">
              反向传播（Backpropagation）是训练人工神经网络的基础算法，由
              Rumelhart、Hinton 和 Williams 于 1986
              年系统性地提出并推广。其本质是利用微积分中的
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">
                链式法则（Chain Rule）
              </span>
              ，高效计算损失函数关于网络中每一个参数的偏导数。
            </p>

            <h2 className="text-base font-semibold text-slate-100 mb-3 mt-6">
              3.1 链式法则的核心推导
            </h2>
            <p className="text-sm text-slate-200 leading-relaxed mb-5">
              设神经网络为一个复合函数{" "}
              <code className="text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">
                L = f(g(h(x)))
              </code>
              ，则根据链式法则，损失 L 对输入 x
              的梯度为三个局部梯度的连乘。这意味着，网络越深，需要相乘的局部梯度就越多。
            </p>

            <div
              className={`my-5 p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl transition-all duration-700 ${targetAnchor === "第5章 · 激活函数" ? "ring-2 ring-cyan-500/60 bg-cyan-500/10" : ""}`}
            >
              <p className="text-sm text-slate-200 leading-relaxed">
                当激活函数选用 Sigmoid 时，其导数的最大值仅为
                0.25。当层数超过 5
                层时，梯度会衰减至接近于零——这便是臭名昭著的
                <strong className="text-slate-100 font-semibold">
                  梯度消失问题（Vanishing Gradient Problem）
                </strong>
                。
              </p>
            </div>

            <h2 className="text-base font-semibold text-slate-100 mb-3 mt-6">
              3.2 梯度消失的量化分析
            </h2>
            <p className="text-sm text-slate-200 leading-relaxed mb-5">
              假设每层 Sigmoid 激活函数的局部梯度均为其最大值
              0.25，那么对于一个 10
              层网络，第一层接收到的梯度信号强度仅为输出层的{" "}
              <code className="text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">
                0.25^10 ≈ 9.5 × 10⁻⁷
              </code>
              ，几乎为零，导致浅层参数根本无法被有效更新。
            </p>

            <h2 className="text-base font-semibold text-slate-100 mb-3 mt-6">
              3.3 BatchNorm 的缓解机制
            </h2>
            <p className="text-sm text-slate-200 leading-relaxed mb-5">
              批量归一化（Batch
              Normalization）通过对每一层的输入进行标准化，将激活值强制约束在梯度较大的区域，从而显著改善了深层网络的训练稳定性。配合
              ReLU
              激活函数，现代深度网络已经能够稳定训练超过百层。
            </p>

            <div className="h-20" />
          </article>
        </div>

        {/* AI Recommendation Floating Bubble */}
        <AnimatePresence>
          {showBubble && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-5 right-5 bg-[#111827] border border-slate-700 rounded-xl p-3.5 max-w-[280px] shadow-2xl z-30"
            >
              <div className="flex items-start gap-2.5">
                <Sparkles
                  size={16}
                  className="text-cyan-400 shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    本章核心概念与你的笔记「梯度消失问题」高度相关，建议提炼为技能卡片。
                  </p>
                  <button className="mt-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer">
                    提炼技能 →
                  </button>
                </div>
                <button
                  onClick={() => setShowBubble(false)}
                  aria-label="关闭推荐"
                  className="text-slate-400 hover:text-slate-100 shrink-0 cursor-pointer p-0.5"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right AI Notes & Assistant Sidebar */}
      <AnimatePresence initial={false}>
        {discussOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 310, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0 bg-[#0c111d] border-l border-white/10"
          >
            <div className="w-[310px] h-full flex flex-col">
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <button className="px-3 py-1 text-xs font-semibold text-cyan-300 bg-cyan-500/20 rounded-md border border-cyan-500/30">
                    笔记
                  </button>
                  <button className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 rounded-md transition-colors cursor-pointer">
                    伴读
                  </button>
                </div>
                <button
                  onClick={() => setDiscussOpen(false)}
                  aria-label="关闭伴读栏"
                  className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Notes waterfall */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {notes.map((note: any) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#111827] border border-slate-700/80 rounded-xl p-3.5 shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => traceNote(note.anchor)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer font-medium"
                      >
                        <Target size={11} /> {note.anchor}
                      </button>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {note.createdAt}
                      </span>
                    </div>
                    {note.quote && (
                      <blockquote className="text-xs text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-lg mb-2 italic leading-relaxed border-l-2 border-emerald-500/40">
                        "{note.quote}"
                      </blockquote>
                    )}
                    <p
                      className="text-xs text-slate-200 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: note.content.replace(
                          /\*\*(.*?)\*\*/g,
                          '<strong class="text-slate-100">$1</strong>',
                        ),
                      }}
                    />
                  </motion.div>
                ))}

                <button className="w-full py-2.5 text-xs text-slate-300 hover:text-slate-100 border border-dashed border-slate-700 rounded-xl hover:border-slate-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer font-medium">
                  <Plus size={13} /> 新建笔记
                </button>
              </div>

              {/* Discuss Input Area */}
              <div className="p-3.5 border-t border-white/10 bg-[#090d16]">
                <div className="flex gap-2">
                  <input
                    value={discussMsg}
                    onChange={(e) => setDiscussMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="向伴读 AI 提问…"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/60 transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={streaming}
                    aria-label="发送消息"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Send size={13} />
                  </button>
                </div>

                {/* Message list */}
                {messages.length > 0 && (
                  <div
                    ref={chatRef}
                    className="mt-3 space-y-2 max-h-[180px] overflow-y-auto"
                  >
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30" : "bg-slate-900 border border-slate-800 text-slate-200"} ${!msg.done ? "cursor-blink" : ""}`}
                          dangerouslySetInnerHTML={{
                            __html: msg.content.replace(
                              /\*\*(.*?)\*\*/g,
                              '<strong class="text-slate-100">$1</strong>',
                            ),
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!discussOpen && (
        <button
          onClick={() => setDiscussOpen(true)}
          aria-label="打开伴读栏"
          className="absolute right-3 top-12 z-10 p-2 bg-[#111827] border border-white/10 rounded-lg text-slate-300 hover:text-slate-100 transition-all cursor-pointer shadow-lg"
        >
          <MessageSquare size={16} />
        </button>
      )}
    </div>
  )
}


