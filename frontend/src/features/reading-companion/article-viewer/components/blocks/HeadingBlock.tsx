import { ContentBlockDO, TextAnnotation } from "../../../../../entities"
import { cn } from "../../../../../shared/utils/cn"
import { AnnotatedText } from "../AnnotatedText"

interface HeadingBlockProps {
  block: ContentBlockDO
  index: number
  isTargeted: boolean
  activeAnnotations: TextAnnotation[]
  blocks: ContentBlockDO[]
  chapterId?: string
  notesData?: any
}

export function HeadingBlock({
  block,
  index,
  isTargeted,
  activeAnnotations,
  blocks,
  chapterId,
  notesData,
}: HeadingBlockProps) {
  const plainText = block.text || ""

  // 解析 Markdown 前缀 '#' 的数量以判断标题层级大小 (1~6)
  const mdMatch = block.html_or_markdown?.match(/^(#{1,6})\s+(.+)$/)
  const level = mdMatch ? mdMatch[1].length : 2
  const hashes = mdMatch ? mdMatch[1] : "#"

  // 根据层级匹配标签与字体大小
  const headingTags = {
    1: "h1",
    2: "h2",
    3: "h3",
    4: "h4",
    5: "h5",
    6: "h6",
  } as const

  const Tag = headingTags[level as keyof typeof headingTags] || "h2"

  const sizeClasses: Record<number, string> = {
    1: "text-xl sm:text-2xl font-extrabold text-slate-100 mb-4 mt-10",
    2: "text-lg sm:text-xl font-bold text-slate-100 mb-3 mt-8",
    3: "text-base sm:text-lg font-semibold text-slate-200 mb-2 mt-6",
    4: "text-sm sm:text-base font-semibold text-slate-200 mb-2 mt-5",
    5: "text-xs sm:text-sm font-medium text-slate-300 mb-1.5 mt-4",
    6: "text-xs font-medium text-slate-400 mb-1 mt-4",
  }

  return (
    <Tag
      key={block.block_id || index}
      id={block.block_id}
      data-block-id={block.block_id}
      data-block-index={index}
      className={cn(
        sizeClasses[level] || sizeClasses[2],
        "flex items-center gap-2 transition-all duration-500 rounded-lg p-1 select-text",
        isTargeted && "ring-2 ring-cyan-400 bg-cyan-950/40"
      )}
    >
      <span className="text-cyan-400/80 font-mono select-none text-xs">{hashes}</span>
      <span>
        <AnnotatedText
          text={plainText}
          annotations={activeAnnotations}
          blockId={block.block_id}
          blockIndex={index}
          blocks={blocks}
          chapterId={chapterId}
          notesData={notesData}
        />
      </span>
    </Tag>
  )
}
