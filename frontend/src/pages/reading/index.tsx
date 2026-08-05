import { useParams, useSearchParams } from "react-router-dom"
import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../shared/api"
import {
  useLayoutStore as useLayout,
  useFocusStore as useFocus,
  useFloatingMenuStore as useFloatingMenu,
} from "../../shared/store"
import { useMemo } from "react"
import {
  CompanionDrawer,
  RecommendationBubble,
  ReadingChapterOutline,
  ReadingWorkspaceHeader,
  ReadingFeedbackToast,
  ReadingArticleViewer,
  type NoteCardData,
  type ChapterItem,
} from "../../features"
import { useBookTocQuery, useAllChapterBlocksQuery, type TocNodeDO } from "../../entities/book"
import { useCreateMaterialNoteMutation } from "../../entities/note"
import { useProjectDetailQuery } from "../../entities/project"
import {
  MOCK_READING_INITIAL_MESSAGES,
  MOCK_READING_AI_REPLY,
} from "../../mock"

function flattenTocNodes(nodes: TocNodeDO[]): ChapterItem[] {
  const result: ChapterItem[] = []
  function traverse(nodeList: TocNodeDO[], depth: number = 0) {
    for (const node of nodeList) {
      result.push({
        id: node.id,
        targetChapterId: node.target_chapter_id || node.id,
        label: node.title,
        level: depth,
        done: false,
      })
      if (node.children && node.children.length > 0) {
        traverse(node.children, depth + 1)
      }
    }
  }
  traverse(nodes, 0)
  return result
}
function getSelectionOffsets(container: HTMLElement, range: Range) {
  let startOffset = 0
  let endOffset = 0

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  )

  let charCount = 0
  let node = walker.nextNode()

  while (node) {
    if (node === range.startContainer) {
      startOffset = charCount + range.startOffset
    }
    if (node === range.endContainer) {
      endOffset = charCount + range.endOffset
      break
    }

    charCount += node.textContent?.length || 0
    node = walker.nextNode()
  }

  return { startOffset, endOffset }
}


export default function ReadingWorkspacePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const bookId = searchParams.get("book_id")
  const queryClient = useQueryClient()
  const [activeChapter, setActiveChapter] = useState("")
  const [rightTab, setRightTab] = useState<"copilot" | "notes">("copilot")

  const { data: tocResponse, isLoading: isTocLoading } = useBookTocQuery(bookId || undefined)
  const { data: projectDetail } = useProjectDetailQuery(id || "")

  const chapters: ChapterItem[] = useMemo(() => {
    if (tocResponse?.toc_tree && tocResponse.toc_tree.length > 0) {
      return flattenTocNodes(tocResponse.toc_tree)
    }
    return []
  }, [tocResponse])

  const chapterMap = useMemo(() => {
    const map = new Map<string, ChapterItem>()
    for (const item of chapters) {
      map.set(item.id, item)
      if (item.targetChapterId && item.targetChapterId !== item.id) {
        map.set(item.targetChapterId, item)
      }
    }
    return map
  }, [chapters])

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
  const [selectedOffsets, setSelectedOffsets] = useState<{ start: number; end: number }>({ start: 0, end: 0 })

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

  // 从 project task_chains 中找到当前章节对应的 TaskChain，取其 status
  const currentTaskChainStatus = useMemo(() => {
    const chains = projectDetail?.task_chains || []
    const matched = chains.find(
      (c) => c.chapter_id === activeChapter || c.chapter_id === chapterMap.get(activeChapter)?.targetChapterId
    )
    const raw = matched?.status
    // PENDING 在阅读视图语境下与 ACTIVE（进行中）等价
    return raw === "PENDING" ? "ACTIVE" : raw
  }, [projectDetail, activeChapter, chapterMap])

  // 从 project task_chains 中找到当前章节对应的 TaskChain，取其 status
  const projectProgress = useMemo(() => {
    const chains = projectDetail?.task_chains || []
    const count = chains.length

    if (count === 0) return 0 // 防止除以 0 得到 NaN

    const doneCount = chains.filter(
      (c) => c.status === "COMPLETED" || c.status === "DONE"
    ).length
    return Math.round((doneCount / count) * 100)
  }, [projectDetail])

  // React Query 缓存与 ReadingArticleViewer 共用同一请求，不产生额外网络开销
  const { data: chapterContentData } = useAllChapterBlocksQuery(bookId || undefined, activeChapter)
  const estimatedMinutes = useMemo(() => {
    const blocks = chapterContentData?.blocks || []
    const totalChars = blocks.reduce((sum, b) => sum + (b.text?.length || 0), 0)
    return Math.max(1, Math.ceil(totalChars / 400))
  }, [chapterContentData])

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

  const createMaterialNoteMutation = useCreateMaterialNoteMutation()

  const currentTaskId = useMemo(() => {
    const chains = projectDetail?.task_chains || []
    const matched = chains.find(
      (c) => c.chapter_id === activeChapter || c.chapter_id === chapterMap.get(activeChapter)?.targetChapterId
    )
    if (matched && matched.tasks && matched.tasks.length > 0) {
      return matched.tasks[0].id
    }
    return matched?.id || ""
  }, [projectDetail, activeChapter, chapterMap])


  // 当真实章节目录加载完成后，若当前选中的章节不在目录中，自动定位至首个真实章节
  useEffect(() => {
    if (chapters.length > 0 && (!activeChapter || !chapterMap.has(activeChapter))) {
      const firstTargetId = chapters[0].targetChapterId || chapters[0].id
      setActiveChapter(firstTargetId)
    }
  }, [chapters, chapterMap, activeChapter])

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
    const container = readerRef.current
    const containerRect = container?.getBoundingClientRect()
    if (!containerRect || !container) return

    // 找出选区起点所在的 Block DOM 节点及其 ID
    let startAnchor = range.startContainer
    if (startAnchor.nodeType !== Node.ELEMENT_NODE) {
      startAnchor = startAnchor.parentNode as Node
    }
    const startBlockEl = (startAnchor as Element).closest("p, h1, h2, h3, h4, h5, h6, pre, blockquote")
    const blockId = startBlockEl?.getAttribute("id") || ""

    // 找出选区终点所在的 Block DOM 节点
    let endAnchor = range.endContainer
    if (endAnchor.nodeType !== Node.ELEMENT_NODE) {
      endAnchor = endAnchor.parentNode as Node
    }
    const endBlockEl = (endAnchor as Element).closest("p, h1, h2, h3, h4, h5, h6, pre, blockquote")

    const isCrossBlock = startBlockEl !== endBlockEl

    let startOffset = 0
    let endOffset = 0
    let noteText = text

    if (startBlockEl) {
      if (isCrossBlock) {
        // 如果跨 Block，将选区截断在起点 Block 文本的末尾，防止 offset 错位导致不渲染
        const tempOffsets = getSelectionOffsets(startBlockEl as HTMLElement, range)
        startOffset = tempOffsets.startOffset
        endOffset = startBlockEl.textContent?.length || 0
        const fullText = startBlockEl.textContent || ""
        noteText = fullText.substring(startOffset, endOffset).trim()
      } else {
        const tempOffsets = getSelectionOffsets(startBlockEl as HTMLElement, range)
        startOffset = tempOffsets.startOffset
        endOffset = tempOffsets.endOffset
      }
    } else {
      const tempOffsets = getSelectionOffsets(container, range)
      startOffset = tempOffsets.startOffset
      endOffset = tempOffsets.endOffset
    }

    setSelectedOffsets({ start: startOffset, end: endOffset })

    const rect = range.getBoundingClientRect()

    const rawX = rect.left - containerRect.left + rect.width / 2 + container.scrollLeft
    const rawY = rect.top - containerRect.top - 10 + container.scrollTop
    const clampedX = Math.max(150, Math.min(rawX, containerRect.width - 150))
    const clampedY = Math.max(10, rawY)

    setFloatingMenu({
      x: clampedX,
      y: clampedY,
      text: noteText,
      blockId,
      startOffset,
      endOffset,
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
  const handleCreateNoteFromSelection = (text: string, interpretation?: string) => {
    const activeChapterLabel = chapterMap.get(activeChapter)?.label || "其他补充笔记"
    createMaterialNoteMutation.mutate({
      project_id: id || "",
      task_id: currentTaskId,
      source_type: "BOOK_BLOCK",
      raw_quote: text,
      user_interpretation: interpretation || text,
      source_anchor: {
        book_id: bookId || "",
        chapter_id: activeChapter || "",
        start_offset: selectedOffsets.start,
        end_offset: selectedOffsets.end,
        feature_text: activeChapterLabel,
      }
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
        chapters={chapters}
        isLoading={isTocLoading}
        activeChapter={activeChapter}
        onSelectChapter={setActiveChapter}
        scrollProgress={scrollProgress}
        projectProgress={projectProgress}
      />

      {/* ──────────────── Center Reader Workspace ──────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#090D16]">
        {/* Top Floating Toast Notification */}
        <ReadingFeedbackToast message={extractedToast} />

        {/* Unified Top Header Bar */}
        <ReadingWorkspaceHeader
          scrollProgress={scrollProgress}
          chapterItem={chapterMap.get(activeChapter)}
          estimatedMinutes={estimatedMinutes}
          status={currentTaskChainStatus}
          onOpenDiscuss={handleOpenDiscuss}
        />

        {/* Reader Scroll Container & Article Content */}
        <ReadingArticleViewer
          projectId={id || ""}
          readerRef={readerRef}
          bookId={bookId || undefined}
          chapterId={activeChapter}
          chapterTitle={chapterMap.get(activeChapter)?.label}
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
          chapterTitle={chapterMap.get(activeChapter)?.label}
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
        chapters={chapters}
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
        projectId={id || ""}
        noteSearch={noteSearch}
        setNoteSearch={setNoteSearch}
        onTraceNote={traceNote}
        onExtractSkill={handleExtractSkill}
      />
    </div>
  )
}
