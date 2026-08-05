import { RefObject, useState, useEffect } from "react"
import { Check, Copy, Lightbulb, BookOpen, Loader2, Info, Wand2, Sparkles } from "lucide-react"
import { ReadingSelectionToolbar } from "./ReadingSelectionToolbar"
import {
  type ContentBlockDO,
  useAIAnnotateMutation,
  useChapterAnnotationQuery,
  type TextAnnotation,
  useAllChapterBlocksQuery,
} from "../../entities"
import { useMaterialNotesQuery } from "../../entities/note"
import { useFloatingMenuStore as useFloatingMenu } from "../../shared/store"
import { cn } from "../../shared/utils/cn"

interface ReadingArticleViewerProps {
  projectId: string
  readerRef: RefObject<HTMLDivElement | null>
  bookId?: string
  chapterId?: string
  chapterTitle?: string
  targetAnchor: string | null
  copiedCode: boolean
  onTextSelect: () => void
  onScroll: () => void
  onCopyFormulaCode: (code: string) => void
  onDiscussSelection: (text: string) => void
  onCreateNoteFromSelection: (
    text: string,
    interpretation?: string,
    offsets?: {
      startOffset?: number;
      endOffset?: number;
      chapter_startOffset?: number;
      chapter_endOffset?: number;
    }
  ) => void
  onExtractSkill: (scopeType: "L1" | "L2", text?: string) => void
  onAIAnnotate?: () => void
}

export function ReadingArticleViewer({
  projectId,
  readerRef,
  bookId,
  chapterId,
  chapterTitle,
  targetAnchor,
  copiedCode,
  onTextSelect,
  onScroll,
  onCopyFormulaCode,
  onDiscussSelection,
  onCreateNoteFromSelection,
  onExtractSkill,
  onAIAnnotate,
}: ReadingArticleViewerProps) {
  const { data: contentData, isLoading } = useAllChapterBlocksQuery(bookId, chapterId)
  const blocks = contentData?.blocks || []

  // 获取当前的划词菜单状态与输入想法状态
  const menu = useFloatingMenu((s) => s.menu)
  const isWritingNote = useFloatingMenu((s) => s.isWritingNote)

  // 获取真实的素材读书笔记数据
  const { data: notesData } = useMaterialNotesQuery({
    project_id: projectId,
    limit: 100,
  })

  // 第一章 AI 标注 Mock 数据定义 (包含核心概念、总结结论、经典引文、概念对比全系类型)
  const FIRST_CHAPTER_MOCK_ANNOTATIONS: TextAnnotation[] = [
    {
      text: "中国社会的基层是乡土性的",
      category: "concept",
      explanation: "核心概念：定义了中国传统社会结构的基础特征与基调",
    },
    {
      text: "土头的",
      category: "quote",
      explanation: "经典引文：指代离不开泥土、靠农业谋生的乡土人群",
    },
    {
      text: "他们才是中国社会的基层",
      category: "conclusion",
      explanation: "关键结论：指出广大乡村人群构成中国社会的核心主体",
    },
    {
      text: "土字的基本意义是指泥土",
      category: "contrast",
      explanation: "概念对比：对比了字面含义与社会学延伸内涵的关联",
    },
  ]

  // 判断当前是否为第一章
  const isFirstChapter =
    !chapterId ||
    chapterId === "ch1" ||
    chapterId === "1" ||
    chapterId.includes("ch1") ||
    chapterTitle?.includes("第一") ||
    chapterTitle?.includes("乡土本色")

  // 1. 自动根据 chapter_id 查询已有的 AI 标注数据（通过 useChapterAnnotationQuery API）
  const { data: cachedAnnotationData } = useChapterAnnotationQuery(bookId, chapterId)

  // 2. 接入手动生成 AI 标注的 Mutation 钩子与本地覆盖状态
  const aiAnnotateMutation = useAIAnnotateMutation()
  const [userOverrideAnnotations, setUserOverrideAnnotations] = useState<TextAnnotation[] | null>(null)

  // 切换章节时自动清空本地覆盖标记
  useEffect(() => {
    setUserOverrideAnnotations(null)
  }, [chapterId])

  // 当前有效显示的标注：
  // 1. 用户主动操作 (userOverrideAnnotations !== null) -> 遵从用户生成/清空动作
  // 2. 服务端已持久化的数据 cachedAnnotationData
  // 3. 未操作 + 第一章 (isFirstChapter) -> 默认展示预置标注
  const activeAnnotations =
    userOverrideAnnotations !== null
      ? userOverrideAnnotations
      : cachedAnnotationData?.annotations && cachedAnnotationData.annotations.length > 0
        ? cachedAnnotationData.annotations
        : isFirstChapter
          ? FIRST_CHAPTER_MOCK_ANNOTATIONS
          : []

  const hasAnnotations = activeAnnotations.length > 0

  // 触发 AI 智能标注生成
  const handleAIAnnotate = () => {
    if (onAIAnnotate) {
      onAIAnnotate()
    }
    const fullContent = blocks.map((b) => b.text).join("\n\n") || "中国社会的基层是乡土性的..."

    aiAnnotateMutation.mutate(
      {
        book_id: bookId,
        chapter_id: chapterId,
        content: fullContent,
      },
      {
        onSuccess: (data) => {
          setUserOverrideAnnotations(data.annotations || [])
        },
      }
    )
  }

  // 清除标注（供按钮或辅助清理使用）
  const handleClearAnnotations = () => {
    setUserOverrideAnnotations([])
  }
  if (false as boolean) {
    handleClearAnnotations()
  }


  interface RawMatch {
    start: number
    end: number
    text: string
    category: string
    explanation?: string
  }

  interface CombinedMatch {
    start: number
    end: number
    text: string
    userNote?: RawMatch
    tempSelection?: RawMatch
    aiAnnotations: RawMatch[]
  }

  // 辅助方法：基于 Slice Boundary Partitioning（切分切割点算法）合并重叠标注
  const buildCombinedMatches = (fullText: string, rawMatches: RawMatch[]): CombinedMatch[] => {
    if (!fullText || rawMatches.length === 0) return []

    const pointsSet = new Set<number>()
    rawMatches.forEach((r) => {
      if (r.start >= 0 && r.end <= fullText.length && r.start < r.end) {
        pointsSet.add(r.start)
        pointsSet.add(r.end)
      }
    })

    const sortedPoints = Array.from(pointsSet).sort((a, b) => a - b)
    const combinedMatches: CombinedMatch[] = []

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const pStart = sortedPoints[i]
      const pEnd = sortedPoints[i + 1]

      const activeMatches = rawMatches.filter((r) => r.start <= pStart && r.end >= pEnd)
      if (activeMatches.length === 0) continue

      const userNote = activeMatches.find((r) => r.category === "user-note")
      const tempSelection = activeMatches.find((r) => r.category === "temp-selection")
      const aiAnnotations = activeMatches.filter((r) => r.category !== "user-note" && r.category !== "temp-selection")

      const prev = combinedMatches[combinedMatches.length - 1]
      const canMergeWithPrev =
        prev &&
        prev.end === pStart &&
        prev.userNote === userNote &&
        prev.tempSelection === tempSelection &&
        prev.aiAnnotations.length === aiAnnotations.length &&
        prev.aiAnnotations.every((ai, idx) => ai === aiAnnotations[idx])

      if (canMergeWithPrev) {
        prev.end = pEnd
        prev.text = fullText.substring(prev.start, prev.end)
      } else {
        combinedMatches.push({
          start: pStart,
          end: pEnd,
          text: fullText.substring(pStart, pEnd),
          userNote,
          tempSelection,
          aiAnnotations,
        })
      }
    }

    return combinedMatches
  }

  // 根据 AI 返回 of TextAnnotation 分类数据及读书笔记动态匹配并高亮/下划线渲染纯文本
  const renderAnnotatedText = (text: string, annotations: TextAnnotation[], blockId?: string, blockIndex?: number) => {
    if (!text) return text

    const rawMatches: RawMatch[] = []

    // 1. 收集真实的素材读书笔记
    const items = notesData?.items || []

    // 计算当前 Block 在整章文本中的绝对物理 offset 范围
    let currentBlockStartOffset = 0
    if (typeof blockIndex === "number" && blocks && blockIndex > 0) {
      for (let i = 0; i < blockIndex && i < blocks.length; i++) {
        currentBlockStartOffset += (blocks[i].text || "").length + 1
      }
    }
    const currentBlockEndOffset = currentBlockStartOffset + text.length

    items.forEach((item) => {
      const anchor = item.source_anchor
      let anchorMatched = false
      // 1.1 优先使用 source_anchor 绝对字符偏移精确匹配
      if (
        anchor &&
        typeof anchor.start_offset === "number" &&
        typeof anchor.end_offset === "number" &&
        anchor.end_offset > anchor.start_offset &&
        (!anchor.chapter_id || anchor.chapter_id === chapterId)
      ) {
        const noteStart = anchor.start_offset
        const noteEnd = anchor.end_offset

        // 计算笔记全局区间与当前 Block 区间的重叠交集
        const overlapStart = Math.max(noteStart, currentBlockStartOffset)
        const overlapEnd = Math.min(noteEnd, currentBlockEndOffset)

        if (overlapStart < overlapEnd) {
          const relStart = overlapStart - currentBlockStartOffset
          const relEnd = overlapEnd - currentBlockStartOffset

          if (relStart >= 0 && relEnd <= text.length && relStart < relEnd) {
            const matchText = text.substring(relStart, relEnd)
            const isDuplicate = rawMatches.some(
              (m) => m.category === "user-note" && m.start === relStart && m.end === relEnd
            )
            if (!isDuplicate) {
              rawMatches.push({
                start: relStart,
                end: relEnd,
                text: matchText,
                category: "user-note",
                explanation: item.user_interpretation,
              })
            }
            anchorMatched = true
          }
        }
      }
    })


    // 1.5. 收集当前选中的临时文本高亮（基于精确的 blockId 和偏移下标）
    if (isWritingNote && menu && menu.text) {
      // 起点 Block：用精确 startOffset/endOffset 高亮
      if (menu.blockId === blockId) {
        const start = menu.startOffset
        const end = menu.endOffset
        if (start >= 0 && end <= text.length && start < end) {
          const isDuplicate = rawMatches.some(
            (m) => m.category === "temp-selection" && m.start === start && m.end === end
          )
          if (!isDuplicate) {
            rawMatches.push({ start, end, text: menu.text, category: "temp-selection" })
          }
        }
      }

      // 中间 Block（3+ Block 跨段时）：中间的 Block 被完全选中，直接高亮整段
      if (menu.middleBlockIds?.includes(blockId || "")) {
        const isDuplicate = rawMatches.some(
          (m) => m.category === "temp-selection" && m.start === 0 && m.end === text.length
        )
        if (!isDuplicate && text.length > 0) {
          rawMatches.push({ start: 0, end: text.length, text, category: "temp-selection" })
        }
      }

      // 终点 Block（跨 Block 时）：从 menu.text 分割出属于本 Block 的部分，用 indexOf 匹配高亮
      if (menu.endBlockId && menu.endBlockId === blockId) {
        const parts = menu.text.split("\n").map((p) => p.trim()).filter((p) => p.length >= 2)
        const lastPart = parts[parts.length - 1]
        if (lastPart) {
          const idx = text.indexOf(lastPart)
          if (idx !== -1) {
            const isDuplicate = rawMatches.some(
              (m) => m.category === "temp-selection" && m.start === idx && m.end === idx + lastPart.length
            )
            if (!isDuplicate) {
              rawMatches.push({ start: idx, end: idx + lastPart.length, text: lastPart, category: "temp-selection" })
            }
          }
        }
      }
    }

    // 2. 收集 AI 标注
    if (annotations && annotations.length > 0) {
      annotations.forEach((ann) => {
        if (!ann.text) return
        let searchIdx = 0
        while (searchIdx < text.length) {
          const idx = text.indexOf(ann.text, searchIdx)
          if (idx === -1) break
          rawMatches.push({
            start: idx,
            end: idx + ann.text.length,
            text: ann.text,
            category: ann.category,
            explanation: ann.explanation,
          })
          searchIdx = idx + ann.text.length
        }
      })
    }

    if (rawMatches.length === 0) return text

    const combinedMatches = buildCombinedMatches(text, rawMatches)

    const nodes: React.ReactNode[] = []
    let lastPos = 0

    combinedMatches.forEach((cm, index) => {
      if (cm.start > lastPos) {
        nodes.push(text.substring(lastPos, cm.start))
      }

      const key = `combined-${cm.start}-${index}`
      const hasUserNote = Boolean(cm.userNote)
      const primaryAI = cm.aiAnnotations[0]

      const hasTempSelection = Boolean(cm.tempSelection)
      const isUserAnnotated = hasUserNote || hasTempSelection

      // 1. 用户划线笔记：提供清爽纯净的暖金底衬（无底描线，为 AI 离线下划线留出整洁空间）
      const userHighlightClass = isUserAnnotated
        ? "bg-amber-500/20 text-amber-100 font-medium rounded-xs px-1 py-0.5"
        : ""

      // 2. AI 标注修饰：采用下划线 + 精致分类微底纹（偏移 5px 避免与用户笔记底衬重叠）
      let underlineClass = ""
      let aiBgClass = ""
      if (primaryAI) {
        if (primaryAI.category === "concept") {
          underlineClass = "underline decoration-emerald-400 decoration-[2px] underline-offset-[5px]"
          aiBgClass = "bg-emerald-500/12 text-emerald-100 px-0.5 rounded-xs"
        } else if (primaryAI.category === "conclusion") {
          underlineClass = "underline decoration-violet-400 decoration-[2px] underline-offset-[5px]"
          aiBgClass = "bg-violet-500/12 text-violet-100 px-0.5 rounded-xs"
        } else if (primaryAI.category === "quote") {
          underlineClass = "underline decoration-cyan-400 decoration-[2px] underline-offset-[5px]"
          aiBgClass = "bg-cyan-500/12 text-cyan-100 px-0.5 rounded-xs"
        } else if (primaryAI.category === "contrast") {
          underlineClass = "underline decoration-wavy decoration-teal-400 decoration-[2px] underline-offset-[5px]"
          aiBgClass = "bg-teal-500/12 text-teal-100 px-0.5 rounded-xs"
        }
      }

      if (hasUserNote && !underlineClass) {
        const overlappingAI = rawMatches.find(
          (r) => r.category !== "user-note"
            && r.category !== "temp-selection"
            && r.start <= cm.start
            && r.end >= cm.end
        )
        if (overlappingAI) {
          if (overlappingAI.category === "concept") {
            underlineClass = "underline decoration-emerald-400 decoration-[2px] underline-offset-[5px]"
          } else if (overlappingAI.category === "conclusion") {
            underlineClass = "underline decoration-violet-400 decoration-[2px] underline-offset-[5px]"
          } else if (overlappingAI.category === "quote") {
            underlineClass = "underline decoration-cyan-400 decoration-[2px] underline-offset-[5px]"
          } else if (overlappingAI.category === "contrast") {
            underlineClass = "underline decoration-wavy decoration-teal-400 decoration-[2px] underline-offset-[5px]"
          }
        }
      }

      const contentElement = (
        <span
          className={cn(
            "inline transition-colors duration-150",
            (hasUserNote || primaryAI) && "cursor-pointer",
            userHighlightClass,
            !isUserAnnotated && aiBgClass,
            underlineClass
          )}
        >
          {cm.text}
        </span>
      )

      // 只有在拥有真实读书笔记或 AI 解析且当前无选区/写笔记菜单激活时，才启用 Popover 悬浮气泡
      const hasOverlappingAI = hasUserNote && rawMatches.some(
        (r) => r.category !== "user-note" && r.category !== "temp-selection" && r.start <= cm.start && r.end >= cm.end
      )
      // 当选区/写笔记菜单激活 (menu !== null) 时，禁用 Popover 展示，消解与划词菜单的重叠顶盖冲突
      const shouldShowPopover = (hasUserNote || cm.aiAnnotations.length > 0 || hasOverlappingAI) && !menu

      // 判断当前段落是否偏向顶部（例如前 2 个 Block），向上弹出会被截断，故智能向下弹出
      const isTopBlock = blockIndex !== undefined && blockIndex <= 1

      if (shouldShowPopover) {
        nodes.push(
          <span key={key} className="relative group inline cursor-pointer">
            {contentElement}

            {/* 融合 Popover 卡片：使用标准 group 与 w-80 规范面板 */}
            <span
              className={cn(
                "absolute left-1/2 -translate-x-1/2 w-80 p-3.5 bg-slate-900/98 rounded-xl shadow-2xl border border-cyan-500/50 shadow-cyan-950/20 backdrop-blur-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50 text-xs font-normal text-left flex flex-col gap-2.5 select-none",
                isTopBlock ? "top-full mt-3" : "bottom-full mb-3"
              )}
            >
              {/* 指向标注词的定位小三角 */}
              <span
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent",
                  isTopBlock
                    ? "bottom-full -mb-px border-b-6 border-b-cyan-500/50"
                    : "top-full -mt-px border-t-6 border-t-cyan-500/50"
                )}
              />

              {/* 1. 读书笔记区块 */}
              {cm.userNote && (
                <span className="flex flex-col gap-1">
                  <span className="flex items-center justify-between pb-1 border-b border-slate-800/40">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 tracking-wide font-sans">
                      <Sparkles size={11} className="text-cyan-400" />
                      <span>读书笔记</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium font-sans bg-slate-800/60 text-slate-400">
                      已保存
                    </span>
                  </span>
                  <span className="text-slate-200 text-sm leading-relaxed block">
                    {cm.userNote.explanation}
                  </span>
                </span>
              )}

              {/* 如果两者同时存在，渲染分隔线 */}
              {cm.userNote && cm.aiAnnotations.length > 0 && (
                <span className="border-t border-slate-800/40 my-0.5 block" />
              )}

              {/* 2. AI 智能解析区块 */}
              {cm.aiAnnotations.map((ai, aIdx) => {
                let labelTag = "核心概念"
                if (ai.category === "conclusion") labelTag = "关键结论"
                if (ai.category === "quote") labelTag = "经典金句"
                if (ai.category === "contrast") labelTag = "概念对比"

                return (
                  <span key={aIdx} className="flex flex-col gap-1">
                    <span className="flex items-center justify-between pb-1 border-b border-slate-800/40">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 tracking-wide font-sans">
                        <Sparkles size={11} className="text-cyan-400" />
                        <span>AI 智能解析</span>
                      </span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-mono font-normal border",
                        ai.category === "concept" && "bg-amber-950/60 text-amber-300 border-amber-500/30",
                        ai.category === "conclusion" && "bg-violet-950/60 text-violet-300 border-violet-500/30",
                        ai.category === "quote" && "bg-purple-950/60 text-purple-300 border-purple-500/30",
                        ai.category === "contrast" && "bg-teal-950/60 text-teal-300 border-teal-500/30"
                      )}>
                        {labelTag}
                      </span>
                    </span>
                    <span className="text-slate-200 text-sm leading-relaxed block">
                      {ai.explanation || `AI 标注分析 · ${ai.category}`}
                    </span>
                  </span>
                )
              })}
            </span>
          </span>
        )
      } else {
        nodes.push(<span key={key}>{contentElement}</span>)
      }

      lastPos = cm.end
    })

    if (lastPos < text.length) {
      nodes.push(text.substring(lastPos))
    }

    return <>{nodes}</>
  }


  const renderBlock = (block: ContentBlockDO, index: number) => {
    const type = block.block_type.toLowerCase()
    const content = block.html_or_markdown || block.text
    const plainText = block.text || ""
    const cleanTarget = targetAnchor ? (targetAnchor.split(" · ").pop() || targetAnchor).trim() : ""
    const isTargeted =
      Boolean(cleanTarget) &&
      (block.block_id === cleanTarget ||
        (Boolean(plainText) && plainText.includes(cleanTarget)) ||
        (cleanTarget.length >= 4 && Boolean(plainText) && plainText.includes(cleanTarget.slice(0, 15))))

    // 标题节点 (Heading)
    if (type.includes("heading") || type.includes("title") || type.includes("header")) {
      return (
        <h2
          key={block.block_id || index}
          id={block.block_id}
          data-block-id={block.block_id}
          data-block-index={index}
          className={cn(
            "text-lg sm:text-xl font-bold text-slate-100 mb-3 mt-8 flex items-center gap-2 transition-all duration-500 rounded-lg p-1",
            isTargeted && "ring-2 ring-cyan-400 bg-cyan-950/40"
          )}
        >
          <span className="text-cyan-400 font-mono select-none">#{block.sequence_index + 1}</span>
          <span>{renderAnnotatedText(plainText, activeAnnotations, block.block_id, index)}</span>
        </h2>
      )
    }

    // 公式/代码块节点 (Formula / Code) — 代码块保留 innerHTML 渲染，不做标注
    if (type.includes("code") || type.includes("formula") || type.includes("math")) {
      return (
        <div
          key={block.block_id || index}
          id={block.block_id}
          data-block-id={block.block_id}
          data-block-index={index}
          className="my-6 p-4 bg-[#0F172A]/80 border border-slate-800 rounded-xl relative group shadow-lg"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-slate-400 font-medium">
              代码 / 数学公式卡片
            </span>
            <button
              onClick={() => onCopyFormulaCode(content)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="复制内容"
            >
              {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
          {block.html_or_markdown ? (
            <div
              className="font-mono text-sm text-cyan-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 overflow-x-auto font-semibold tracking-wide"
              dangerouslySetInnerHTML={{ __html: block.html_or_markdown }}
            />
          ) : (
            <div className="font-mono text-sm text-cyan-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 overflow-x-auto font-semibold tracking-wide">
              {block.text}
            </div>
          )}
        </div>
      )
    }

    // 重点高亮/提示框节点 (Callout / Quote)
    if (type.includes("callout") || type.includes("quote") || type.includes("note")) {
      return (
        <div
          key={block.block_id || index}
          id={block.block_id}
          data-block-id={block.block_id}
          data-block-index={index}
          className={cn(
            "my-6 p-4 rounded-xl border transition-all duration-700",
            isTargeted
              ? "ring-2 ring-cyan-400 bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
              : "bg-slate-900/60 border-slate-800"
          )}
        >
          <div className="flex items-start gap-3">
            <Lightbulb size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-200 mb-1 select-none">重点标注</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {renderAnnotatedText(plainText, activeAnnotations, block.block_id, index)}
              </p>
            </div>
          </div>
        </div>
      )
    }

    // 默认段落节点 (Paragraph) — 统一走 React renderAnnotatedText，确保 tooltip hover 效果正常
    return (
      <p
        key={block.block_id || index}
        id={block.block_id}
        data-block-id={block.block_id}
        data-block-index={index}
        className={cn(
          "text-[16px] xl:text-[18px] 2xl:text-[19px] leading-[1.85] xl:leading-[1.95] 2xl:leading-[2.0] text-slate-300 mb-6 transition-all duration-500 rounded p-1",
          isTargeted && "ring-2 ring-cyan-400 bg-cyan-950/40"
        )}
      >
        {renderAnnotatedText(plainText, activeAnnotations, block.block_id, index)}
      </p>
    )
  }

  return (
    <div
      ref={readerRef}
      className="flex-1 overflow-y-auto px-4 sm:px-6 2xl:px-12 py-6 2xl:py-10 relative scrollbar-thin scrollbar-thumb-slate-800/50 selection:bg-cyan-500/20 selection:text-cyan-200"
      onMouseUp={onTextSelect}
      onScroll={onScroll}
    >
      {/* Floating Text Selection Menu Toolbar */}
      <ReadingSelectionToolbar
        onDiscuss={onDiscussSelection}
        onCreateNote={(text, interpretation, offsets) =>
          onCreateNoteFromSelection(text, interpretation, offsets)
        }
        onExtractSkill={(scopeType, text) => onExtractSkill(scopeType, text)}
      />

      {/* Main Article Body */}
      <article className="max-w-[720px] xl:max-w-[880px] 2xl:max-w-[1040px] mx-auto text-slate-200 leading-relaxed font-sans transition-all duration-300">
        {/* Editorial Header (主行两端平衡布局) */}
        <div className="mb-8 pb-5 border-b border-slate-800/60 font-sans">
          <div className="flex items-start justify-between gap-6">
            {/* 左侧：章节大标题与出版切片元数据 */}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-slate-100 tracking-tight leading-tight">
                {chapterTitle || `乡土本色`}
              </h1>

              {contentData && (
                <div className="text-xs text-slate-400 font-mono flex items-center gap-3 mt-3">
                  <span className="bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded-md text-cyan-400 font-medium shadow-xs">
                    切片索引：#{contentData.chapter_index}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span>总切片数：{contentData.total_blocks}</span>
                </div>
              )}
            </div>

            {/* 右侧 Action 区：像素级完全统一的胶囊按钮组 */}
            <div className="flex items-center gap-2.5 shrink-0 pt-1">
              {/* 仅在获取不到标注时展示“AI 智能标注”主行动按钮 (高亮紫色渐变填充) */}
              {!hasAnnotations && (
                <button
                  onClick={handleAIAnnotate}
                  disabled={aiAnnotateMutation.isPending}
                  className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600/40 via-purple-500/35 to-indigo-600/40 hover:from-violet-600/60 hover:to-indigo-600/60 border border-violet-400/60 hover:border-violet-300 text-violet-100 hover:text-white font-semibold transition-all duration-200 text-xs cursor-pointer shadow-[0_0_18px_rgba(139,92,246,0.35)] hover:shadow-[0_0_24px_rgba(139,92,246,0.5)] active:scale-95 whitespace-nowrap disabled:opacity-50"
                  title="触发 AI 对当前章节进行自动重点标注"
                >
                  {aiAnnotateMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin text-violet-300 shrink-0" />
                  ) : (
                    <Wand2 size={13} className="text-violet-300 group-hover:rotate-12 transition-transform shrink-0" />
                  )}
                  <span>{aiAnnotateMutation.isPending ? "AI 分析标注中..." : "AI 智能标注"}</span>
                </button>
              )}

              {/* 图例/标注说明按钮 + 悬停 Popover 浮层 (去除多余文案说明，仅保留纯粹示例) */}
              <div className="relative group inline-flex items-center">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0D182A] hover:bg-[#13223B] border border-cyan-500/50 hover:border-cyan-400 text-cyan-200 hover:text-white transition-all duration-200 text-xs font-medium cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                >
                  <Info size={13} className="text-cyan-400 shrink-0" />
                  <span>标注说明</span>
                </button>

                {/* 悬停 Popover 浮层 (剔除所有解说文案，仅留纯粹示例) */}
                <div className="absolute right-0 top-full mt-2 w-48 p-2.5 bg-[#0B1120] border border-slate-700/90 rounded-xl shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto transition-all duration-150 z-50 text-xs font-sans">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="bg-amber-500/25 text-amber-200 font-medium px-2 py-0.5 rounded-xs text-xs">
                        我的笔记
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                      <span className="underline decoration-emerald-400 decoration-[2px] underline-offset-4 text-slate-200">
                        核心概念
                      </span>
                      <span className="underline decoration-violet-400 decoration-[2px] underline-offset-4 text-slate-200">
                        关键结论
                      </span>
                      <span className="underline decoration-cyan-400 decoration-[2px] underline-offset-4 text-slate-200">
                        经典引文
                      </span>
                      <span className="underline decoration-wavy decoration-teal-400 decoration-[2px] underline-offset-4 text-slate-200">
                        概念对比
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={24} className="animate-spin text-cyan-400" />
            <span className="text-xs font-mono">正在加载章节内容...</span>
          </div>
        )}

        {/* Content Render: 由后端 API blocks 真实切片数据驱动动态渲染 */}
        {!isLoading && blocks.length > 0 && (
          <div className="space-y-4 text-slate-300">
            {blocks.map((block, idx) => renderBlock(block, idx))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && blocks.length === 0 && (
          <div className="py-20 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-900/20">
            <BookOpen size={28} className="text-slate-600" />
            <p className="text-sm font-medium text-slate-300">本章节暂无文本内容切片</p>
            <p className="text-xs text-slate-500 font-mono">请尝试在左侧选择其他目录章节</p>
          </div>
        )}

        <div className="h-16" />
      </article>
    </div>
  )
}