import { RefObject } from "react"
import { Check, Copy, Lightbulb, BookOpen, Loader2 } from "lucide-react"
import { ReadingSelectionToolbar } from "./ReadingSelectionToolbar"
import { useChapterContentQuery, type ContentBlockDO } from "../../entities/book"
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
}: ReadingArticleViewerProps) {
  const { data: contentData, isLoading } = useChapterContentQuery(bookId, chapterId)
  const blocks = contentData?.blocks || []

  // 渲染单一内容块 Block
  const renderBlock = (block: ContentBlockDO, index: number) => {
    const type = block.block_type.toLowerCase()
    const content = block.html_or_markdown || block.text
    const isTargeted =
      targetAnchor &&
      (targetAnchor.includes(block.block_id) ||
        targetAnchor.includes(block.text.substring(0, 10)))

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
          {block.html_or_markdown ? (
            <span dangerouslySetInnerHTML={{ __html: block.html_or_markdown }} />
          ) : (
            <span>{block.text}</span>
          )}
        </h2>
      )
    }

    // 公式/代码块节点 (Formula / Code)
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
              {block.html_or_markdown ? (
                <div
                  className="text-xs text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: block.html_or_markdown }}
                />
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed">{block.text}</p>
              )}
            </div>
          </div>
        </div>
      )
    }

    // 默认段落节点 (Paragraph)
    if (block.html_or_markdown) {
      return (
        <div
          key={block.block_id || index}
          id={block.block_id}
          className={cn(
            "text-base leading-[1.8] text-slate-300 mb-6 transition-all duration-500 rounded p-1",
            isTargeted && "ring-2 ring-cyan-400 bg-cyan-950/40"
          )}
          dangerouslySetInnerHTML={{ __html: block.html_or_markdown }}
        />
      )
    }

    return (
      <p
        key={block.block_id || index}
        id={block.block_id}
        className={cn(
          "text-base leading-[1.8] text-slate-300 mb-6 transition-all duration-500 rounded p-1",
          isTargeted && "ring-2 ring-cyan-400 bg-cyan-950/40"
        )}
      >
        {block.text}
      </p>
    )
  }

  return (
    <div
      ref={readerRef}
      className="flex-1 overflow-y-auto px-4 sm:px-6 2xl:px-12 py-6 2xl:py-10 relative scrollbar-thin scrollbar-thumb-slate-800"
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
      <article className="max-w-[720px] mx-auto text-slate-200 leading-relaxed font-sans">
        {/* Header */}
        <div className="mb-8 pb-4 border-b border-slate-800/80">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            Chapter Reading View
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2 mb-3 tracking-tight">
            {chapterTitle || `章节内容 (${chapterId || "未选中"})`}
          </h1>
          {contentData && (
            <p className="text-xs text-slate-400 font-mono">
              切片索引：#{contentData.chapter_index} · 总 Block 数：{contentData.total_blocks}
            </p>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={24} className="animate-spin text-cyan-400" />
            <span className="text-xs font-mono">正在加载章节内容...</span>
          </div>
        )}

        {/* Content Render */}
        {!isLoading && blocks.length > 0 && (
          <div>{blocks.map((block, idx) => renderBlock(block, idx))}</div>
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
