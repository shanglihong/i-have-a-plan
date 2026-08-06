import { ContentBlockDO, TextAnnotation } from "../../../../../entities"
import { cn } from "../../../../../shared/utils/cn"
import { AnnotatedText } from "../AnnotatedText"

interface ParagraphBlockProps {
  block: ContentBlockDO
  index: number
  isTargeted: boolean
  activeAnnotations: TextAnnotation[]
  blocks: ContentBlockDO[]
  chapterId?: string
  notesData?: any
}

export function ParagraphBlock({
  block,
  index,
  isTargeted,
  activeAnnotations,
  blocks,
  chapterId,
  notesData,
}: ParagraphBlockProps) {
  const plainText = block.text || block.html_or_markdown || ""

  return (
    <p
      key={block.block_id || index}
      id={block.block_id}
      data-block-id={block.block_id}
      data-block-index={index}
      className={cn(
        "text-[16px] xl:text-[18px] 2xl:text-[19px] leading-[1.85] xl:leading-[1.95] 2xl:leading-[2.0] text-slate-300 mb-6 transition-all duration-500 rounded p-1 whitespace-pre-wrap",
        isTargeted && "ring-2 ring-cyan-400 bg-cyan-950/40"
      )}
    >
      <AnnotatedText
        text={plainText}
        annotations={activeAnnotations}
        blockId={block.block_id}
        blockIndex={index}
        blocks={blocks}
        chapterId={chapterId}
        notesData={notesData}
      />
    </p>
  )
}

