import { useParams, useSearchParams } from "react-router-dom"
import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../shared/api"
import {
  useLayoutStore as useLayout,
  useFocusStore as useFocus,
  useFloatingMenuStore as useFloatingMenu,
} from "../../shared/store"
import {
  CompanionDrawer,
  RecommendationBubble,
  ReadingChapterOutline,
  ReadingWorkspaceHeader,
  ReadingFeedbackToast,
  ReadingArticleViewer,
  type ChapterMarker,
  type NoteCardData,
} from "../../features"
import {
  MOCK_READING_INITIAL_MESSAGES,
  MOCK_READING_NOTES_FALLBACK,
  MOCK_READING_AI_REPLY,
} from "../../mock"

export default function ReadingWorkspacePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const bookId = searchParams.get("book_id")
  const queryClient = useQueryClient()
  const [activeChapter, setActiveChapter] = useState("ch3")
  const [rightTab, setRightTab] = useState<"copilot" | "notes">("copilot")

  const setOutlineOpen = useLayout((s) => s.setOutlineOpen)
  const discussOpen = useLayout((s) => s.discussOpen)
  const setDiscussOpen = useLayout((s) => s.setDiscussOpen)

  const targetAnchor = useFocus((s) => s.targetAnchor)
  const setTargetAnchor = useFocus((s) => s.setTargetAnchor)

  const setFloatingMenu = useFloatingMenu((s) => s.setMenu)

  const [discussMsg, setDiscussMsg] = useState("")
  const [quotedContext, setQuotedContext] = useState<string | null>(null)
  const [noteSearch, setNoteSearch] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [is25InchPlus, setIs25InchPlus] = useState(false)
  const [isLaptopOrSmaller, setIsLaptopOrSmaller] = useState(false)

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
  const [extractedToast, setExtractedToast] = useState<string | null>(null)

  const readerRef = useRef<HTMLDivElement>(null)

  // 响应式检测大屏 (≥ 1536px) 与笔记本屏
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

  // 笔记本屏下打开伴读栏时自动收起左侧目录
  const handleOpenDiscuss = () => {
    if (isLaptopOrSmaller) {
      setOutlineOpen(false)
    }
    setDiscussOpen(true)
  }

  const { data: notesData } = useQuery({
    queryKey: ["project-notes", id, bookId],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}/notes`)
      return res.data
    },
  })
  const notes: NoteCardData[] = notesData?.items || MOCK_READING_NOTES_FALLBACK

  const createNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post(`/notes`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-notes", id] })
    },
  })

  const chapterMarkers: ChapterMarker[] = [
    { id: "ch1", label: "第1章 · 前言与理论背景", progressPercent: 15, estimatedMinutes: 8 },
    { id: "ch2", label: "第2章 · 神经网络基础", progressPercent: 35, estimatedMinutes: 15 },
    { id: "ch3", label: "第3章 · 反向传播算法", progressPercent: 60, estimatedMinutes: 24 },
    { id: "ch4", label: "第4章 · 优化器与正则化", progressPercent: 80, estimatedMinutes: 18 },
    { id: "ch5", label: "第5章 · 深度模型实战", progressPercent: 95, estimatedMinutes: 30 },
  ]

  // 点击笔记锚点平滑定位与发光高亮
  useEffect(() => {
    if (targetAnchor && readerRef.current) {
      const elements = Array.from(
        readerRef.current.querySelectorAll("h1, h2, h3, p, div, blockquote")
      )
      const targetEl = elements.find((el) =>
        el.textContent?.includes(targetAnchor.split(" · ")[1] || targetAnchor)
      )
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" })
        targetEl.classList.add("ring-2", "ring-cyan-400", "bg-cyan-950/40", "transition-all", "duration-500")
        setTimeout(() => {
          targetEl.classList.remove("ring-2", "ring-cyan-400", "bg-cyan-950/40")
        }, 2200)
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

    const rawX = rect.left - containerRect.left + rect.width / 2
    const rawY = rect.top - containerRect.top - 52
    const clampedX = Math.max(120, Math.min(rawX, containerRect.width - 120))
    const clampedY = Math.max(10, rawY)

    setFloatingMenu({
      x: clampedX,
      y: clampedY,
      text,
    })
  }, [setFloatingMenu])

  // 划词发起提问 Discuss
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

  // 提炼技能 Trigger
  const handleExtractSkill = (scopeType: "L1" | "L2", _data?: any) => {
    const label = scopeType === "L1" ? `已成功将笔记提炼为沙箱技能 Draft` : `已打包本章精华并生成技能树`
    setExtractedToast(label)
    setTimeout(() => setExtractedToast(null), 3000)
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
      Math.max(0, (scrollTop / (scrollHeight - clientHeight)) * 100)
    )
    setScrollProgress(progress)
    setShowBubble(progress >= 65 && progress <= 98)
  }, [])

  const copyFormulaCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#090D16] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ──────────────── Left Chapter Outline Sidebar ──────────────── */}
      <ReadingChapterOutline
        bookId={bookId || undefined}
        activeChapter={activeChapter}
        onSelectChapter={setActiveChapter}
        scrollProgress={scrollProgress}
      />

      {/* ──────────────── Center Reader Workspace ──────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#090D16]">
        {/* Top Floating Toast Notification */}
        <ReadingFeedbackToast message={extractedToast} />

        {/* Unified Top Header Bar */}
        <ReadingWorkspaceHeader
          scrollProgress={scrollProgress}
          chapterTitle={chapterMarkers.find((c) => c.id === activeChapter)?.label}
          onOpenDiscuss={handleOpenDiscuss}
        />

        {/* Reader Scroll Container & Article Content */}
        <ReadingArticleViewer
          readerRef={readerRef}
          targetAnchor={targetAnchor}
          copiedCode={copiedCode}
          onTextSelect={handleTextSelect}
          onScroll={handleScroll}
          onCopyFormulaCode={copyFormulaCode}
          onDiscussSelection={handleDiscussSelection}
          onCreateNoteFromSelection={handleCreateNoteFromSelection}
          onExtractSkill={handleExtractSkill}
        />

        {/* Chapter End Recommendation Bubble */}
        <RecommendationBubble
          isVisible={showBubble}
          isLaptopOrSmaller={isLaptopOrSmaller}
          chapterTitle={chapterMarkers.find((c) => c.id === activeChapter)?.label}
          onClose={() => setShowBubble(false)}
          onGenerateSkill={() => {
            handleExtractSkill("L2")
            setShowBubble(false)
          }}
          onStartDiscuss={() => {
            handleDiscussSelection("请帮我归纳梯度消失的核心成因与解决方案")
            setShowBubble(false)
          }}
        />
      </div>

      {/* ──────────────── Right Companion Drawer Component ──────────────── */}
      <CompanionDrawer
        isOpen={discussOpen}
        onClose={() => setDiscussOpen(false)}
        is25InchPlus={is25InchPlus}
        isLaptopOrSmaller={isLaptopOrSmaller}
        activeTab={rightTab}
        onTabChange={setRightTab}
        activeChapterId={activeChapter}
        messages={messages}
        streaming={streaming}
        discussMsg={discussMsg}
        setDiscussMsg={setDiscussMsg}
        quotedContext={quotedContext}
        setQuotedContext={setQuotedContext}
        onSendMessage={sendMessage}
        onStopStreaming={() => setStreaming(false)}
        onRegenerateLast={() => sendMessage("请重新阐述关于梯度消失的核心解法")}
        onAddTaskToPlan={(taskTitle) => {
          setExtractedToast(`已将【${taskTitle}】成功注入计划项目执行任务树`)
          setTimeout(() => setExtractedToast(null), 3000)
        }}
        notes={notes}
        noteSearch={noteSearch}
        setNoteSearch={setNoteSearch}
        onTraceNote={traceNote}
        onCreateNote={(data) => createNoteMutation.mutate(data)}
        onExtractSkill={handleExtractSkill}
      />
    </div>
  )
}
