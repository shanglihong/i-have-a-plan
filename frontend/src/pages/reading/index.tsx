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
  X,
  Send,
  Bookmark,
  Plus,
  Circle,
  CheckCircle2,
  Sparkles,
  Target,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  BookOpen,
  Search,
  Copy,
  Check,
  Clock,
  Quote,
  Lightbulb,
} from "lucide-react"

import { StatusBadge, ProgressBar } from "../../shared/ui"
import { CompanionDrawer } from "./components/CompanionDrawer"
import {
  MOCK_READING_CHAPTERS,
  MOCK_READING_INITIAL_MESSAGES,
  MOCK_READING_NOTES_FALLBACK,
  MOCK_READING_AI_REPLY,
} from "../../shared/mock/data"

// ─── Reading Workspace Page ────────────────────────────────────────────────────────

export default function ReadingWorkspacePage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [activeChapter, setActiveChapter] = useState("ch3")
  const [rightTab, setRightTab] = useState<"copilot" | "notes">("copilot")

  const outlineOpen = useLayoutStore((s) => s.outlineOpen)
  const setOutlineOpen = useLayoutStore((s) => s.setOutlineOpen)
  const discussOpen = useLayoutStore((s) => s.discussOpen)
  const setDiscussOpen = useLayoutStore((s) => s.setDiscussOpen)

  const targetAnchor = useFocusStore((s) => s.targetAnchor)
  const setTargetAnchor = useFocusStore((s) => s.setTargetAnchor)

  const floatingMenu = useFloatingMenuStore((s) => s.menu)
  const setFloatingMenu = useFloatingMenuStore((s) => s.setMenu)

  const [discussMsg, setDiscussMsg] = useState("")
  const [quotedContext, setQuotedContext] = useState<string | null>(null)
  const [noteSearch, setNoteSearch] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [is25InchPlus, setIs25InchPlus] = useState(false)

  const [messages, setMessages] = useState<
    Array<{
      role: string
      content: string
      done: boolean
      quote: string | null
    }>
  >(MOCK_READING_INITIAL_MESSAGES)
  const [streaming, setStreaming] = useState(false)
  const [showBubble, setShowBubble] = useState(false)
  const readerRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const [isLaptopOrSmaller, setIsLaptopOrSmaller] = useState(false)

  // 响应式检测大屏 (≥ 1536px) 与笔记本屏 (含 13" Mac 1440px/1366px < 1536px)
  useEffect(() => {
    const checkScreenSize = () => {
      const w = window.innerWidth
      setIs25InchPlus(w >= 1536)
      setIsLaptopOrSmaller(w < 1536)
    }
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  // 笔记本屏下打开伴读栏时自动收起左侧目录，保障 13" Mac 文章正文的最佳阅读宽度
  const handleOpenDiscuss = () => {
    if (isLaptopOrSmaller) {
      setOutlineOpen(false)
    }
    setDiscussOpen(true)
  }

  // 键盘 Escape 快捷键
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
  }, [messages, streaming])

  const { data: notesData } = useQuery({
    queryKey: ["project-notes", id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}/notes`)
      return res.data
    },
  })
  const notes = notesData?.items || MOCK_READING_NOTES_FALLBACK

  const createNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post(`/notes`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-notes", id] })
    },
  })

  const chapters = MOCK_READING_CHAPTERS


  // 点击笔记锚点平滑定位与高亮脉冲
  useEffect(() => {
    if (targetAnchor && readerRef.current) {
      const elements = Array.from(
        readerRef.current.querySelectorAll("h1, h2, h3, p, div, blockquote"),
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

  // 划词定位菜单计算
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

    // 边界安全处理
    const rawX = rect.left - containerRect.left + rect.width / 2
    const rawY = rect.top - containerRect.top - 52
    const clampedX = Math.max(100, Math.min(rawX, containerRect.width - 100))
    const clampedY = Math.max(10, rawY)

    setFloatingMenu({
      x: clampedX,
      y: clampedY,
      text,
    })
  }, [setFloatingMenu])

  // 划词发起讨论
  const handleDiscussSelection = (text: string) => {
    setQuotedContext(text)
    setRightTab("copilot")
    handleOpenDiscuss()
    setFloatingMenu(null)
  }

  // 划词快速记笔记
  const handleCreateNoteFromSelection = (text: string) => {
    createNoteMutation.mutate({
      content: text,
      quote: text,
      anchor: "第3章 · 反向传播算法",
    })
    setRightTab("notes")
    handleOpenDiscuss()
    setFloatingMenu(null)
  }

  // AI 伴读对话发送
  const sendMessage = (promptText?: string) => {
    const textToSend = promptText || discussMsg
    if (!textToSend.trim()) return

    const userQuote = quotedContext
    setDiscussMsg("")
    setQuotedContext(null)
    setMessages((m) => [
      ...m,
      { role: "user", content: textToSend, done: true, quote: userQuote },
    ])
    setStreaming(true)

    const reply = MOCK_READING_AI_REPLY

    let i = 0
    setMessages((m) => [
      ...m,
      { role: "assistant", content: "", done: false, quote: null },
    ])

    const interval = setInterval(() => {
      i += 4
      setMessages((m) => {
        const last = [...m]
        last[last.length - 1] = {
          role: "assistant",
          content: reply.slice(0, i),
          done: false,
          quote: null,
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
    }, 25)
  }

  const traceNote = (noteAnchor: string) => {
    setTargetAnchor(noteAnchor)
    setTimeout(() => setTargetAnchor(null), 2500)
  }

  const handleScroll = useCallback(() => {
    if (!readerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = readerRef.current
    const progress = Math.min(
      100,
      Math.max(0, (scrollTop / (scrollHeight - clientHeight)) * 100),
    )
    setScrollProgress(progress)
    setShowBubble(progress >= 65 && progress <= 95)
  }, [])

  const copyFormulaCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const filteredNotes = notes.filter(
    (n: any) =>
      n.content?.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.quote?.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.anchor?.toLowerCase().includes(noteSearch.toLowerCase()),
  )

  return (
    <div className="h-full flex overflow-hidden bg-[#090D16] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ──────────────── Left Chapter Outline Sidebar ──────────────── */}
      <AnimatePresence initial={false}>
        {outlineOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 250, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="border-r border-slate-800/80 bg-[#0C111D] shrink-0 z-20"
          >
            <div className="w-[250px] h-full flex flex-col">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-slate-800/80 bg-[#090D16]/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen size={15} className="text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200 tracking-wide">
                      章节目录
                    </span>
                  </div>
                  <button
                    onClick={() => setOutlineOpen(false)}
                    aria-label="收起目录"
                    className="text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <PanelLeftClose size={15} />
                  </button>
                </div>

                {/* Progress Overview */}
                <div className="space-y-2.5 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-medium">
                      <span>阅读进度</span>
                      <span className="font-mono text-cyan-400 font-semibold">
                        {Math.round(scrollProgress)}%
                      </span>
                    </div>
                    <ProgressBar value={scrollProgress} color="cyan" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-medium">
                      <span>精读卡片理解</span>
                      <span className="font-mono text-violet-400 font-semibold">
                        82%
                      </span>
                    </div>
                    <ProgressBar value={82} color="violet" />
                  </div>
                </div>
              </div>

              {/* Chapters Tree Nav */}
              <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                {chapters.map((ch) => {
                  const isCurrent = activeChapter === ch.id
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChapter(ch.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all flex items-center gap-2.5 cursor-pointer font-medium
                        ${isCurrent
                          ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950/50"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                        }
                        ${ch.level === 1 ? "ml-3 text-[11px] py-2" : ""}`}
                    >
                      {ch.done ? (
                        <CheckCircle2
                          size={13}
                          className="text-emerald-400 shrink-0"
                        />
                      ) : isCurrent ? (
                        <Circle
                          size={13}
                          className="text-cyan-400 fill-cyan-400/30 shrink-0"
                        />
                      ) : (
                        <Circle
                          size={13}
                          className="text-slate-600 shrink-0"
                        />
                      )}
                      <span className="leading-snug truncate">{ch.label}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="p-3 border-t border-slate-800/80 bg-[#090D16]/30 text-[11px] text-slate-500 flex items-center justify-between font-mono">
                <span>共 5 章 12 节</span>
                <span className="text-emerald-400/80">已完成 60%</span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ──────────────── Center Reader Workspace ──────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#090D16]">
        {/* Unified Top Header Bar */}
        <header className="h-12 px-4 border-b border-slate-800/80 bg-[#0C111D]/90 backdrop-blur-md flex items-center gap-3 shrink-0 z-10 relative">
          {/* Outline Toggle */}
          {!outlineOpen && (
            <button
              onClick={() => setOutlineOpen(true)}
              aria-label="展开目录"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition-colors cursor-pointer"
              title="展开目录栏"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}

          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-slate-400 hidden sm:inline truncate font-medium">
              深度学习基础理论精读
            </span>
            <ChevronRight size={13} className="text-slate-600 hidden sm:inline shrink-0" />
            <span className="text-xs font-semibold text-slate-100 truncate">
              第3章 · 反向传播算法
            </span>
          </div>

          <div className="flex-1" />

          {/* Reading Stats & Status Badge */}
          <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-full text-slate-300">
              <Clock size={12} className="text-cyan-400" />
              <span>预计 ~24 min</span>
            </div>
            <StatusBadge status="ACTIVE" />

            {/* Sidebar Discuss Toggle */}
            {!discussOpen && (
              <button
                onClick={handleOpenDiscuss}
                aria-label="打开伴读栏"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <PanelRightOpen size={15} />
                <span className="hidden sm:inline">伴读与笔记</span>
              </button>
            )}
          </div>

          {/* Top Reading Scroll Progress Line */}
          <div
            className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-150 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </header>

        {/* Reader Scroll Container */}
        <div
          ref={readerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-8 2xl:px-12 py-8 2xl:py-10 relative scrollbar-thin scrollbar-thumb-slate-800"
          onMouseUp={handleTextSelect}
          onScroll={handleScroll}
        >

        {/* Floating Selection Menu */}
        <AnimatePresence>
          {floatingMenu && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.12 }}
              className="absolute z-50 bg-[#121A29] border border-slate-700/90 rounded-xl shadow-2xl px-2 py-1.5 flex items-center gap-1 backdrop-blur-lg"
              style={{
                left: floatingMenu.x - 90,
                top: floatingMenu.y,
              }}
            >
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-200 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-lg transition-all cursor-pointer font-semibold"
                onClick={() => handleDiscussSelection(floatingMenu.text)}
              >
                <MessageSquare size={13} className="text-cyan-400" />
                提问 AI
              </button>

              <div className="w-px h-4 bg-slate-700/80" />

              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-200 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-all cursor-pointer font-semibold"
                onClick={() => handleCreateNoteFromSelection(floatingMenu.text)}
              >
                <Bookmark size={13} className="text-emerald-400" />
                记笔记
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Body (Max Width 720px for optimal readability) */}
        <article className="max-w-[720px] mx-auto text-slate-200 leading-relaxed font-sans">
          {/* Document Header */}
          <div className="mb-8 pb-4 border-b border-slate-800/80">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
              Core Theory Reading · Chapter 3
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2 mb-3 tracking-tight">
              第三章：反向传播算法及其微积分推导
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              发布时间：2026-07-19 · 阅读难度：高级 · 核心考点：链式法则、梯度衰减
            </p>
          </div>

          {/* Paragraph 1 */}
          <p className="text-[15px] leading-[1.8] text-slate-300 mb-6">
            反向传播（Backpropagation）是训练人工神经网络的核心算法，由 Rumelhart、Hinton 和 Williams 于 1986 年系统性地提出。其本质在于借助微积分中的
            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 mx-1 rounded font-medium">
              链式求导法则 (Chain Rule)
            </span>
            ，高效且精准地计算损失函数关于神经网络中每一个可修学习参数的偏导数。
          </p>

          {/* Section 3.1 */}
          <h2 className="text-lg font-bold text-slate-100 mb-3 mt-8 flex items-center gap-2">
            <span className="text-cyan-400 font-mono">3.1</span> 链式法则的核心微积分推导
          </h2>
          <p className="text-[15px] leading-[1.8] text-slate-300 mb-5">
            设一个典型的多层前馈神经网络可以抽象为复合函数{" "}
            <code className="text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">
              L = f(g(h(x)))
            </code>
            ，根据多元微积分法则，目标损失 L 关于最内层输入变量 x 的梯度等于各个局部梯度的连乘：
          </p>

          {/* Math Formula Card Block */}
          <div className="my-6 p-4 bg-[#0F172A]/80 border border-slate-800 rounded-xl relative group shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono text-slate-400 font-medium">
                链式求导公式 (Chain Rule Expression)
              </span>
              <button
                onClick={() =>
                  copyFormulaCode(
                    "∂L/∂x = (∂L/∂f) · (∂f/∂g) · (∂g/∂h) · (∂h/∂x)",
                  )
                }
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="复制公式"
              >
                {copiedCode ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            <div className="font-mono text-sm text-cyan-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 overflow-x-auto text-center font-semibold tracking-wide">
              ∂L / ∂x = (∂L / ∂f) · (∂f / ∂g) · (∂g / ∂h) · (∂h / ∂x)
            </div>
          </div>

          {/* Section 3.2 */}
          <h2 className="text-lg font-bold text-slate-100 mb-3 mt-8 flex items-center gap-2">
            <span className="text-cyan-400 font-mono">3.2</span> 梯度消失现象与定量分析
          </h2>

          {/* Callout Box with Target Anchor Glow Pulse */}
          <div
            className={`my-6 p-4 rounded-xl border transition-all duration-700 ${targetAnchor?.includes("梯度消失") || targetAnchor?.includes("3.2")
                ? "ring-2 ring-cyan-400 bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
                : "bg-slate-900/60 border-slate-800"
              }`}
          >
            <div className="flex items-start gap-3">
              <Lightbulb size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200 mb-1">
                  重点避坑：梯度消失 (Vanishing Gradient Problem)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  当传统激活函数选用 Sigmoid 时，其导数区间仅为 <code className="text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded font-mono">(0, 0.25]</code>。在多层神经网络中，当层数超出 5 层以上时，首尾梯度相乘将导致信号呈指数级收缩至零。
                </p>
              </div>
            </div>
          </div>

          <p className="text-[15px] leading-[1.8] text-slate-300 mb-5">
            假设每层 Sigmoid 激活函数的局部导数均取最大值 0.25，对于一个 10 层的深层网络，第 1 层接收到的残差更新信号强度仅为：
          </p>

          <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-300 mb-6 text-center">
            0.25¹⁰ ≈ 9.5367 × 10⁻⁷  (浅层参数近乎停滞更新)
          </div>

          {/* Section 3.3 */}
          <h2 className="text-lg font-bold text-slate-100 mb-3 mt-8 flex items-center gap-2">
            <span className="text-cyan-400 font-mono">3.3</span> Batch Normalization 与 ResNet 现代解法
          </h2>
          <p className="text-[15px] leading-[1.8] text-slate-300 mb-6">
            批量归一化（Batch Normalization）通过将每一隐藏层的输入分布强制拉回到均值为 0、方差为 1 的标准正态分布区间，从而完美避开了 Sigmoid 的两端饱和区。配合
            <span className="text-cyan-300 font-medium mx-1">ReLU (Rectified Linear Unit)</span>
            以及 ResNet 残差连接，现代深度模型已成功支撑上千层网络的稳定收敛。
          </p>

          <div className="h-24" />
        </article>
      </div>

      {/* AI Recommendation Floating Bubble */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="absolute bottom-6 right-6 bg-[#0F172A] border border-cyan-500/40 rounded-xl p-4 2xl:p-5 max-w-[300px] 2xl:max-w-[380px] shadow-2xl z-30 backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs 2xl:text-sm font-bold text-slate-100 mb-1">
                  AI 伴读提醒
                </h5>
                <p className="text-xs 2xl:text-sm text-slate-300 leading-relaxed">
                  检测到您正在深度阅读「梯度消失」，是否生成此考点的记忆卡片？
                </p>
                <button
                  onClick={() => {
                    handleDiscussSelection("请帮我归纳梯度消失的核心成因与解决方案")
                    setShowBubble(false)
                  }}
                  className="mt-2.5 px-3 py-1.5 2xl:px-3.5 2xl:py-2 text-xs 2xl:text-xs font-semibold text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  生成技能卡片 →
                </button>
              </div>
              <button
                onClick={() => setShowBubble(false)}
                aria-label="关闭推荐"
                className="text-slate-400 hover:text-slate-100 shrink-0 cursor-pointer p-0.5 rounded hover:bg-slate-800"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

      {/* ──────────────── Right Notes & AI Copilot Sidebar Component ──────────────── */}
      <CompanionDrawer
        isOpen={discussOpen}
        onClose={() => setDiscussOpen(false)}
        is25InchPlus={is25InchPlus}
        isLaptopOrSmaller={isLaptopOrSmaller}
        activeTab={rightTab}
        onTabChange={setRightTab}
        messages={messages}
        streaming={streaming}
        discussMsg={discussMsg}
        setDiscussMsg={setDiscussMsg}
        quotedContext={quotedContext}
        setQuotedContext={setQuotedContext}
        onSendMessage={sendMessage}
        notes={notes}
        noteSearch={noteSearch}
        setNoteSearch={setNoteSearch}
        onTraceNote={traceNote}
        onCreateNote={(data) => createNoteMutation.mutate(data)}
      />

      {!discussOpen && (
        <button
          onClick={handleOpenDiscuss}
          aria-label="打开伴读与笔记栏"
          title="展开伴读与笔记栏"
          className="absolute right-4 top-14 z-10 p-2.5 bg-[#0F172A]/90 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-500/60 rounded-xl text-cyan-300 hover:text-cyan-200 transition-all cursor-pointer shadow-xl backdrop-blur-md group"
        >
          <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  )
}


