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
  let startOffset = -1
  let endOffset = -1

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        let parent = node.parentNode
        while (parent && parent !== container) {
          if (parent instanceof HTMLElement && (
            parent.classList.contains("absolute") ||
            parent.classList.contains("select-none") ||
            parent.style.position === "absolute"
          )) {
            return NodeFilter.FILTER_REJECT
          }
          parent = parent.parentNode
        }
        return NodeFilter.FILTER_ACCEPT
      }
    }
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

  if (startOffset === -1) {
    startOffset = 0
  }
  if (endOffset === -1) {
    endOffset = charCount
  }

  return { startOffset, endOffset }
}


export default function ReadingWorkspacePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [activeChapter, setActiveChapter] = useState("")
  const [rightTab, setRightTab] = useState<"copilot" | "notes">("copilot")

  const { data: projectDetail } = useProjectDetailQuery(id || "")
  const effectiveBookId = useMemo(() => {
    return searchParams.get("book_id") || projectDetail?.book_id || projectDetail?.book?.id || ""
  }, [searchParams, projectDetail])

  const { data: tocResponse, isLoading: isTocLoading } = useBookTocQuery(effectiveBookId || undefined)

  const chapters: ChapterItem[] = useMemo(() => {
    if (tocResponse?.toc_tree && tocResponse.toc_tree.length > 0) {
      return flattenTocNodes(tocResponse.toc_tree)
    }
    return []
  }, [tocResponse])

  const chapterMap = useMemo(() => {
    const map = new Map<string, ChapterItem>()
    for (const item of chapters) {
      if (!map.has(item.id) || item.level === 0) {
        map.set(item.id, item)
      }
      if (item.targetChapterId) {
        if (!map.has(item.targetChapterId) || item.level === 0) {
          map.set(item.targetChapterId, item)
        }
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
  const prevTargetElRef = useRef<HTMLElement | null>(null)

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

  const realChapterId = useMemo(() => {
    return chapterMap.get(activeChapter)?.targetChapterId || activeChapter
  }, [chapterMap, activeChapter])

  // React Query 缓存与 ReadingArticleViewer 共用同一请求，不产生额外网络开销
  const { data: chapterContentData } = useAllChapterBlocksQuery(effectiveBookId || undefined, realChapterId)
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
    if (!targetAnchor || !readerRef.current) return

    // 清理和标准化搜索文本
    const rawTarget = targetAnchor.split(" · ").pop() || targetAnchor
    const cleanTarget = rawTarget.trim()
    if (!cleanTarget) return

    const allElements = Array.from(
      readerRef.current.querySelectorAll("h1, h2, h3, h4, h5, h6, p, blockquote, pre")
    ) as HTMLElement[]

    // 1. 过滤所有包含目标引文或精准匹配 block_id 的候选节点（排除整个 readerRef 根节点）
    const candidates = allElements.filter((el) => {
      if (el === readerRef.current) return false

      // 优先支持按精准 block_id 匹配
      const elId = el.getAttribute("id")
      if (elId && elId === cleanTarget) return true

      const text = el.textContent || ""
      if (text.includes(cleanTarget)) return true

      // 去除标点与多余空白后的模糊特征匹配
      const simplifiedTarget = cleanTarget.replace(/[\s\p{P}]/gu, "")
      if (simplifiedTarget.length >= 2) {
        const simplifiedText = text.replace(/[\s\p{P}]/gu, "")
        return simplifiedText.includes(simplifiedTarget.slice(0, 15))
      }
      return false
    })

    // 2. 核心数学筛选算法：找到无任何“子候选节点”的最小/最深末端承载节点（消除父级容器多余高亮）
    let targetEl = candidates.find(
      (candidate) => !candidates.some((other) => other !== candidate && candidate.contains(other))
    )

    // 如果未找到最精细子节点，退化使用第 1 个候选节点
    if (!targetEl && candidates.length > 0) {
      targetEl = candidates[0]
    }

    if (prevTargetElRef.current) {
      prevTargetElRef.current.classList.remove(
        "ring-2",
        "ring-cyan-400/80",
        "bg-cyan-950/40",
        "scale-[1.01]",
        "rounded-md"
      )
      prevTargetElRef.current = null
    }

    if (targetEl) {
      prevTargetElRef.current = targetEl
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" })
      targetEl.classList.add(
        "ring-2",
        "ring-cyan-400/80",
        "bg-cyan-950/40",
        "scale-[1.01]",
        "transition-all",
        "duration-500",
        "rounded-md"
      )
      setTimeout(() => {
        if (targetEl) {
          targetEl.classList.remove(
            "ring-2",
            "ring-cyan-400/80",
            "bg-cyan-950/40",
            "scale-[1.01]",
            "rounded-md"
          )
        }
      }, 2000)
    }

    const autoClearTimer = setTimeout(() => {
      setTargetAnchor(null)
    }, 2000)

    return () => clearTimeout(autoClearTimer)
  }, [targetAnchor, chapterContentData, setTargetAnchor])

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
    const startBlockEl = (startAnchor as Element).closest("[data-block-id], p, h1, h2, h3, h4, h5, h6, pre, blockquote")
    const blockId = startBlockEl?.getAttribute("data-block-id") || startBlockEl?.getAttribute("id") || ""

    // 找出选区终点所在的 Block DOM 节点
    let endAnchor = range.endContainer
    if (endAnchor.nodeType !== Node.ELEMENT_NODE) {
      endAnchor = endAnchor.parentNode as Node
    }
    const endBlockEl = (endAnchor as Element).closest("[data-block-id], p, h1, h2, h3, h4, h5, h6, pre, blockquote")

    const isCrossBlock = startBlockEl !== endBlockEl
    const endBlockId = isCrossBlock ? (endBlockEl?.getAttribute("data-block-id") || endBlockEl?.getAttribute("id") || "") : undefined

    // 收集起点与终点之间所有中间 Block 的 id（用于 3+ Block 跨段高亮）
    const middleBlockIds: string[] = []
    if (isCrossBlock && startBlockEl && endBlockEl) {
      let current = startBlockEl.nextElementSibling
      while (current && current !== endBlockEl) {
        const id = current.getAttribute("data-block-id") || current.getAttribute("id")
        if (id) middleBlockIds.push(id)
        current = current.nextElementSibling
      }
    }

    let blockStartOffset = 0
    let blockEndOffset = 0
    let chapterStartOffset = 0
    let chapterEndOffset = 0
    let noteText = text
    if (startBlockEl) {
      const tempOffsets = getSelectionOffsets(startBlockEl as HTMLElement, range)
      blockStartOffset = tempOffsets.startOffset
      blockEndOffset = tempOffsets.endOffset

      // 计算 startBlockEl 在整章全量 Blocks 中的前缀字符总长度
      let blockPrefixOffset = 0
      if (chapterContentData?.blocks && chapterContentData.blocks.length > 0) {
        let targetIndex = -1
        if (blockId) {
          targetIndex = chapterContentData.blocks.findIndex((b) => b.block_id === blockId)
        }
        if (targetIndex === -1 && startBlockEl.hasAttribute("data-block-index")) {
          targetIndex = parseInt(startBlockEl.getAttribute("data-block-index") || "-1", 10)
        }

        if (targetIndex > 0) {
          for (let i = 0; i < targetIndex && i < chapterContentData.blocks.length; i++) {
            blockPrefixOffset += (chapterContentData.blocks[i].text || "").length + 1
          }
        }
      }
      chapterStartOffset = blockPrefixOffset + tempOffsets.startOffset

      if (isCrossBlock) {
        chapterEndOffset = chapterStartOffset + text.length
        noteText = text
      } else {
        chapterEndOffset = chapterStartOffset + (tempOffsets.endOffset - tempOffsets.startOffset)
      }
    } else {
      const tempOffsets = getSelectionOffsets(container, range)
      blockStartOffset = tempOffsets.startOffset
      blockEndOffset = tempOffsets.endOffset
      chapterStartOffset = tempOffsets.startOffset
      chapterEndOffset = tempOffsets.endOffset
    }

    setSelectedOffsets({ start: chapterStartOffset, end: chapterEndOffset })

    const rect = range.getBoundingClientRect()

    const rawX = rect.left - containerRect.left + rect.width / 2 + container.scrollLeft

    // 智能上下方向决策 (Smart Placement)：写笔记面板高约 220px，若上方空间不足 230px 且下方空间充足，向下展开
    const spaceAbove = rect.top - containerRect.top
    const spaceBelow = containerRect.bottom - rect.bottom
    const placement: "top" | "bottom" = spaceAbove < 230 && spaceBelow >= 120 ? "bottom" : "top"

    const rawY = placement === "bottom"
      ? rect.bottom - containerRect.top + 10 + container.scrollTop
      : rect.top - containerRect.top - 10 + container.scrollTop

    // 靠边水平边界 clamp (写笔记卡片半宽 160px + 16px 安全边距 = 176px)
    const halfWidth = 176
    const clampedX = containerRect.width < halfWidth * 2
      ? containerRect.width / 2
      : Math.max(halfWidth, Math.min(rawX, containerRect.width - halfWidth))
    const clampedY = Math.max(10, rawY)

    setFloatingMenu({
      x: clampedX,
      y: clampedY,
      placement,
      text: noteText,
      blockId,
      endBlockId,
      middleBlockIds: middleBlockIds.length > 0 ? middleBlockIds : undefined,
      startOffset: blockStartOffset,
      endOffset: blockEndOffset,
      chapter_startOffset: chapterStartOffset,
      chapter_endOffset: chapterEndOffset,
    })
  }, [setFloatingMenu, chapterContentData])

  // 划词发起提问 Discuss
  const handleDiscussSelection = (text: string) => {
    setQuotedContext(text)
    setRightTab("copilot")
    handleOpenDiscuss()
    setFloatingMenu(null)
  }

  // 划词快速记笔记
  const handleCreateNoteFromSelection = (
    text: string,
    interpretation?: string,
    offsets?: {
      startOffset?: number;
      endOffset?: number;
      chapter_startOffset?: number;
      chapter_endOffset?: number;
    }
  ) => {
    const activeChapterLabel = chapterMap.get(activeChapter)?.label || "其他补充笔记"
    const currentMenu = useFloatingMenu.getState().menu
    const startOffset = offsets?.chapter_startOffset ?? currentMenu?.chapter_startOffset ?? selectedOffsets.start
    const endOffset = offsets?.chapter_endOffset ?? currentMenu?.chapter_endOffset ?? selectedOffsets.end

    createMaterialNoteMutation.mutate({
      project_id: id || "",
      task_id: currentTaskId,
      source_type: "BOOK_BLOCK",
      raw_quote: text,
      user_interpretation: interpretation || text,
      source_anchor: {
        book_id: effectiveBookId || "",
        chapter_id: realChapterId || "",
        start_offset: startOffset,
        end_offset: endOffset,
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

  const traceNote = (noteAnchor: string, sourceAnchor?: any) => {
    // 1. 智能章节多重关联判断与自动无缝切换
    if (sourceAnchor?.chapter_id) {
      const rawChId = sourceAnchor.chapter_id
      const matchedCh =
        chapterMap.get(rawChId) ||
        chapters.find(
          (c) =>
            c.id === rawChId ||
            c.targetChapterId === rawChId ||
            (Boolean(c.id) && rawChId.includes(c.id)) ||
            (Boolean(c.targetChapterId) && rawChId.includes(c.targetChapterId))
        )
      if (matchedCh) {
        const realChId = matchedCh.targetChapterId || matchedCh.id
        if (activeChapter !== realChId) {
          setActiveChapter(realChId)
        }
      }
    }

    // 2. 基于 start_offset 在全章 Blocks 中精准定位目标物理 Block
    let searchTarget = ""
    if (
      sourceAnchor &&
      typeof sourceAnchor.start_offset === "number" &&
      chapterContentData?.blocks &&
      chapterContentData.blocks.length > 0
    ) {
      const targetOffset = sourceAnchor.start_offset
      let currentAcc = 0
      for (const b of chapterContentData.blocks) {
        const len = (b.text || "").length
        if (currentAcc + len >= targetOffset) {
          searchTarget = b.block_id || (b.text ? b.text.substring(0, 20) : "")
          break
        }
        currentAcc += len + 1
      }
    }

    // 3. 兜底标靶逻辑（若无法通过 offset 命中，且引文非单字短文本，使用 noteAnchor 或 feature_text）
    if (!searchTarget) {
      if (noteAnchor && noteAnchor.trim().length >= 2) {
        searchTarget = noteAnchor
      } else {
        searchTarget = sourceAnchor?.feature_text || noteAnchor || ""
      }
    }

    setTargetAnchor(searchTarget)
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
        onSelectChapter={(rootChapId, item) => {
          // 清除文本划选选区与浮动操作菜单
          window.getSelection()?.removeAllRanges()
          setFloatingMenu(null)

          // 仅当归属的顶层章节变更时，才触发整章内容切换
          if (rootChapId && rootChapId !== activeChapter) {
            setActiveChapter(rootChapId)
          }

          // 无论是顶层章节还是子章节，只要有标题，统一触发页面标题/Block 锚点定位与选中框
          if (item.label) {
            setTargetAnchor(item.label)
          }
        }}
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
          bookId={effectiveBookId || undefined}
          chapterId={realChapterId}
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
        onDeleteNote={(noteId) => {
          setExtractedToast("笔记已成功删除")
          setTimeout(() => setExtractedToast(null), 2500)
        }}
        onExtractSkill={handleExtractSkill}
      />
    </div>
  )
}
