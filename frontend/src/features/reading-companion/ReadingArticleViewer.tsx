import { RefObject, useState } from "react"
import { Check, Copy, Lightbulb, BookOpen, Loader2, Info, Wand2, RotateCcw } from "lucide-react"
import { ReadingSelectionToolbar } from "./ReadingSelectionToolbar"
import {
  type ContentBlockDO,
  useAIAnnotateMutation,
  useChapterAnnotationQuery,
  type TextAnnotation,
  useAllChapterBlocksQuery,
} from "../../entities"
import { cn } from "../../shared/utils/cn"

interface ReadingArticleViewerProps {
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
  onCreateNoteFromSelection: (text: string) => void
  onExtractSkill: (scopeType: "L1" | "L2", text?: string) => void
  onAIAnnotate?: () => void
}

export function ReadingArticleViewer({
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

  // 1. 自动根据 chapter_id 查询已有的 AI 标注数据（通过 useChapterAnnotationQuery API）
  const { data: cachedAnnotationData } = useChapterAnnotationQuery(bookId, chapterId)

  // 2. 接入手动生成 AI 标注的 Mutation 钩子与本地覆盖状态
  const aiAnnotateMutation = useAIAnnotateMutation()
  const [userOverrideAnnotations, setUserOverrideAnnotations] = useState<TextAnnotation[] | null>(null)

  // 当前有效显示的标注：用户主动生成的标注 / 清空标记 > 默认 API 获取到的标注
  const activeAnnotations =
    userOverrideAnnotations !== null
      ? userOverrideAnnotations
      : cachedAnnotationData?.annotations || []

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

  // 清除标注
  const handleClearAnnotations = () => {
    setUserOverrideAnnotations([])
  }

  // MOCK 示例文本（必须是章节内容中真实存在的字符串，否则 indexOf 永远返回 -1）
  const MOCK_NOTE_TEXT = "在我们这片远东大陆上，可能在很古的时候住过些还不知道种地的原始人，那些人的生活怎样，对于我们至多只有一些好奇的兴趣罢了。以现在的情形来说，这片大陆上最大多数的人是拖泥带水下田讨生活的了。我们不妨缩小一些范围来看，三条大河的流域已经全是农业区"
  const MOCK_NOTE_EXPLANATION =
    "这句话精辟概括了农业社会人口的空间稳定性——土地束缚使定居成为规律，迁移反而是罕见的例外。"

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
      const aiAnnotations = activeMatches.filter((r) => r.category !== "user-note")

      const prev = combinedMatches[combinedMatches.length - 1]
      const canMergeWithPrev =
        prev &&
        prev.end === pStart &&
        prev.userNote === userNote &&
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
          aiAnnotations,
        })
      }
    }

    return combinedMatches
  }

  // 根据 AI 返回的 TextAnnotation 分类数据及读书笔记动态匹配并高亮/下划线渲染纯文本
  const renderAnnotatedText = (text: string, annotations: TextAnnotation[]) => {
    if (!text) return text

    const rawMatches: RawMatch[] = []

    // 1. 收集读书笔记
    if (text.includes(MOCK_NOTE_TEXT)) {
      let searchIdx = 0
      while (searchIdx < text.length) {
        const idx = text.indexOf(MOCK_NOTE_TEXT, searchIdx)
        if (idx === -1) break
        rawMatches.push({
          start: idx,
          end: idx + MOCK_NOTE_TEXT.length,
          text: MOCK_NOTE_TEXT,
          category: "user-note",
          explanation: MOCK_NOTE_EXPLANATION,
        })
        searchIdx = idx + MOCK_NOTE_TEXT.length
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

      // 视效修饰：下划线统一使用 css underline 属性，避免 border-b 引起的盒子高度和基线错位
      let underlineClass = ""
      if (primaryAI) {
        if (primaryAI.category === "concept") underlineClass = "underline decoration-amber-400 decoration-[3px] underline-offset-[4px]"
        else if (primaryAI.category === "conclusion") underlineClass = "underline decoration-violet-400 decoration-[3px] underline-offset-[4px]"
        else if (primaryAI.category === "quote") underlineClass = "underline decoration-purple-400 decoration-[3px] underline-offset-[4px]"
        else if (primaryAI.category === "contrast") underlineClass = "underline decoration-wavy decoration-teal-400 decoration-[3px] underline-offset-[4px]"
      }

      const highlightClass = hasUserNote
        ? "bg-amber-400/45 rounded-sm px-0.5"
        : ""

      const contentElement = (
        <span
          className={cn(
            "inline cursor-pointer transition-colors duration-150",
            highlightClass,
            underlineClass
          )}
        >
          {cm.text}
        </span>
      )

      nodes.push(
        <span key={key} className="relative group inline cursor-pointer">
          {contentElement}

          {/* 融合 Popover 卡片：使用标准 group 与 w-80 规范面板 */}
          <span
            className={cn(
              "absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 p-3.5 bg-slate-900/98 rounded-xl shadow-2xl border backdrop-blur-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50 text-xs font-normal text-left flex flex-col gap-2.5",
              hasUserNote ? "border-amber-500/50 shadow-amber-950/30" : "border-cyan-500/50 shadow-cyan-950/20"
            )}
          >
            {/* 指向标注词的定位小三角 */}
            <span
              className={cn(
                "absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-x-6 border-x-transparent border-t-6",
                hasUserNote ? "border-t-amber-500/50" : "border-t-cyan-500/50"
              )}
            />

            {/* 1. 读书笔记区块 */}
            {cm.userNote && (
              <span className="flex flex-col gap-1">
                <span className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="text-amber-400 font-bold text-[11px] font-mono">
                    读书笔记
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-500/30">
                    划线笔记
                  </span>
                </span>
                <span className="text-slate-200 text-sm leading-relaxed block">
                  {cm.userNote.explanation}
                </span>
              </span>
            )}

            {/* 如果两者同时存在，渲染分隔线 */}
            {cm.userNote && cm.aiAnnotations.length > 0 && (
              <span className="border-t border-slate-800 my-0.5 block" />
            )}

            {/* 2. AI 智能解析区块 */}
            {cm.aiAnnotations.map((ai, aIdx) => {
              let labelTag = "核心概念"
              if (ai.category === "conclusion") labelTag = "关键结论"
              if (ai.category === "quote") labelTag = "经典金句"
              if (ai.category === "contrast") labelTag = "概念对比"

              return (
                <span key={aIdx} className="flex flex-col gap-1">
                  <span className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="text-cyan-400 font-bold text-[11px] font-mono">
                      AI 智能解析
                    </span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-mono font-normal border",
                      ai.category === "concept" && "bg-amber-950/60 text-amber-300 border-amber-500/30",
                      ai.category === "conclusion" && "bg-violet-950/60 text-violet-300 border-violet-500/30",
                      ai.category === "quote" && "bg-purple-950/60 text-purple-300 border-purple-500/30",
                      ai.category === "contrast" && "bg-teal-950/60 text-teal-300 border-teal-500/30",
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

      lastPos = cm.end
    })

    if (lastPos < text.length) {
      nodes.push(text.substring(lastPos))
    }

    return <>{nodes}</>
  }



  // 从 HTML 字符串中提取纯文本（用于将 html_or_markdown 内容交给 React 路径渲染，避免 innerHTML+Tailwind group-hover 失效）
  const extractTextFromHTML = (html: string): string => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, "text/html")
      return doc.body.textContent || ""
    } catch {
      return html
    }
  }

  const renderBlock = (block: ContentBlockDO, index: number) => {
    const type = block.block_type.toLowerCase()
    const content = block.html_or_markdown || block.text
    const isTargeted =
      targetAnchor &&
      (targetAnchor.includes(block.block_id) ||
        targetAnchor.includes(block.text.substring(0, 10)))

    // 获取用于标注匹配的纯文本：优先从 html_or_markdown 提取，降级使用 block.text
    const plainText = block.html_or_markdown
      ? extractTextFromHTML(block.html_or_markdown)
      : block.text

    // 标题节点 (Heading)
    if (type.includes("heading") || type.includes("title") || type.includes("header")) {
      return (
        <h2
          key={block.block_id || index}
          id={block.block_id}
          className={cn(
            "text-lg sm:text-xl font-bold text-slate-100 mb-3 mt-8 flex items-center gap-2 transition-all duration-500 rounded-lg p-1",
            isTargeted && "ring-2 ring-cyan-400 bg-cyan-950/40"
          )}
        >
          <span className="text-cyan-400 font-mono">#{block.sequence_index + 1}</span>
          <span>{renderAnnotatedText(plainText, activeAnnotations)}</span>
        </h2>
      )
    }

    // 公式/代码块节点 (Formula / Code) — 代码块保留 innerHTML 渲染，不做标注
    if (type.includes("code") || type.includes("formula") || type.includes("math")) {
      return (
        <div
          key={block.block_id || index}
          id={block.block_id}
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
              <h4 className="text-xs font-bold text-slate-200 mb-1">重点标注</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {renderAnnotatedText(plainText, activeAnnotations)}
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
        className={cn(
          "text-[16px] xl:text-[18px] 2xl:text-[19px] leading-[1.85] xl:leading-[1.95] 2xl:leading-[2.0] text-slate-300 mb-6 transition-all duration-500 rounded p-1",
          isTargeted && "ring-2 ring-cyan-400 bg-cyan-950/40"
        )}
      >
        {renderAnnotatedText(plainText, activeAnnotations)}
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
        onCreateNote={onCreateNoteFromSelection}
        onExtractSkill={(scopeType, text) => onExtractSkill(scopeType, text)}
      />

      {/* Main Article Body */}
      <article className="max-w-[720px] xl:max-w-[880px] 2xl:max-w-[1040px] mx-auto text-slate-200 leading-relaxed font-sans transition-all duration-300">
        {/* Editorial Header */}
        <div className="mb-8 pb-5 border-b border-slate-800/60">
          <div className="flex items-center justify-between gap-4 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-medium tracking-wider text-cyan-400/90 uppercase">
                FEI XIAOTONG · 《乡土中国》
              </span>
              <span className="text-slate-700">/</span>
              <span className="text-[11px] font-mono text-slate-400">第一篇</span>
            </div>

            {/* 右侧 Action 区：AI 智能标注按钮（仅在无标注时显示） + 重置按钮 + 图例说明 */}
            <div className="flex items-center gap-3">
              {/* 仅在获取不到标注时展示“AI 智能标注”生成按钮 */}
              {!hasAnnotations && (
                <button
                  onClick={handleAIAnnotate}
                  disabled={aiAnnotateMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/35 hover:border-cyan-400/80 text-cyan-300 hover:text-cyan-100 transition-all duration-300 text-xs font-medium cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] active:scale-95 disabled:opacity-50"
                  title="触发 AI 对当前章节进行自动重点标注"
                >
                  {aiAnnotateMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin text-cyan-400" />
                  ) : (
                    <Wand2 size={13} className="text-cyan-400" />
                  )}
                  <span>{aiAnnotateMutation.isPending ? "AI 分析标注中..." : "AI 智能标注"}</span>
                </button>
              )}

              {/* 有标注时展示重置/清空图标 */}
              {hasAnnotations && (
                <button
                  onClick={handleClearAnnotations}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-transparent hover:border-slate-700"
                  title="重置/清除当前 AI 标注"
                >
                  <RotateCcw size={13} />
                </button>
              )}

              {/* 图例说明 Tip */}
              <div className="relative group inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer">
                <Info size={14} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
                <span className="text-xs font-mono text-slate-400 group-hover:text-slate-200 transition-colors">
                  图例说明
                </span>

                {/* 悬停浮层：全系下划线标注图例 (Hover Popover) */}
                <div className="absolute right-0 top-full mt-2 w-52 p-3 bg-slate-900/95 border border-slate-800 rounded-xl shadow-xl backdrop-blur-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800/80">
                    <span className="font-semibold text-slate-200 text-[11px]">标注图例</span>
                    <span className="text-[10px] text-slate-500 font-mono">Legend</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-[11px] text-center">
                    <span className="underline decoration-amber-400 decoration-[3px] underline-offset-[4px] text-slate-300 font-medium pb-0.5">
                      核心概念
                    </span>
                    <span className="underline decoration-violet-400 decoration-[3px] underline-offset-[4px] text-slate-300 font-medium pb-0.5">
                      关键结论
                    </span>
                    <span className="underline decoration-purple-400 decoration-[3px] underline-offset-[4px] text-slate-300 font-medium py-0.5">
                      经典金句
                    </span>
                    <span className="underline decoration-wavy decoration-teal-400 decoration-[3px] underline-offset-[4px] text-slate-300 font-medium pb-0.5">
                      概念对比
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-slate-100 tracking-tight leading-tight">
            {chapterTitle || `乡土本色`}
          </h1>

          {contentData && (
            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3 mt-3">
              <span>切片索引：#{contentData.chapter_index}</span>
              <span>•</span>
              <span>总切片数：{contentData.total_blocks}</span>
            </div>
          )}
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