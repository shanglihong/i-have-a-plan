import { BookOpen, Loader2 } from "lucide-react"
import { ReadingSelectionToolbar } from "./ReadingSelectionToolbar"
import { useAllChapterBlocksQuery } from "../../entities"
import { useMaterialNotesQuery } from "../../entities/note"
import { ReadingArticleViewerProps } from "./article-viewer/types"
import { useReadingAnnotations } from "./article-viewer/hooks/useReadingAnnotations"
import { ReadingArticleHeader } from "./article-viewer/components/ReadingArticleHeader"
import { ArticleBlockRenderer } from "./article-viewer/components/blocks/ArticleBlockRenderer"

export type { ReadingArticleViewerProps }

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
  // 1. 获取后端文章切片数据
  const { data: contentData, isLoading } = useAllChapterBlocksQuery(bookId, chapterId)
  const blocks = contentData?.blocks || []

  // 2. 获取素材读书笔记数据
  const { data: notesData } = useMaterialNotesQuery({
    project_id: projectId,
    limit: 100,
  })

  // 3. 管理 AI 标注及 Mock / 状态逻辑
  const { activeAnnotations, hasAnnotations, handleAIAnnotate, isPending } = useReadingAnnotations({
    bookId,
    chapterId,
    chapterTitle,
    blocks,
    onAIAnnotate,
  })

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
        {/* Editorial Header (章节标题与操作栏) */}
        <ReadingArticleHeader
          chapterTitle={chapterTitle}
          contentData={contentData}
          hasAnnotations={hasAnnotations}
          isPending={isPending}
          onAIAnnotate={handleAIAnnotate}
        />

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
            {blocks.map((block, idx) => (
              <ArticleBlockRenderer
                key={block.block_id || idx}
                block={block}
                index={idx}
                bookId={bookId}
                targetAnchor={targetAnchor}
                activeAnnotations={activeAnnotations}
                blocks={blocks}
                chapterId={chapterId}
                notesData={notesData}
                copiedCode={copiedCode}
                onCopyFormulaCode={onCopyFormulaCode}
              />
            ))}
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