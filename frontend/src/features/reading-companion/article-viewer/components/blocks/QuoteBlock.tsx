import { Quote } from "lucide-react"
import { ContentBlockDO, TextAnnotation } from "../../../../../entities"
import { READING_TOKENS } from "../../../../../shared/constants"
import { cn } from "../../../../../shared/utils/cn"
import { AnnotatedText } from "../AnnotatedText"

interface QuoteBlockProps {
  block: ContentBlockDO
  index: number
  isTargeted: boolean
  activeAnnotations: TextAnnotation[]
  blocks: ContentBlockDO[]
  chapterId?: string
  notesData?: any
}

export function QuoteBlock({
  block,
  index,
  isTargeted,
  activeAnnotations,
  blocks,
  chapterId,
  notesData,
}: QuoteBlockProps) {
  const plainText = block.text || ""

  return (
    <blockquote
      key={block.block_id || index}
      id={block.block_id}
      data-block-id={block.block_id}
      data-block-index={index}
      className={cn(
        "my-6 p-3.5 md:p-4 transition-all duration-700 relative group flex items-start gap-2.5 select-text",
        READING_TOKENS.surface.quote,
        isTargeted && "ring-2 ring-cyan-400 bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
      )}
    >
      <Quote size={15} className="text-amber-400 shrink-0 mt-1" />
      <div className="min-w-0 flex-1 text-[15px] md:text-[16px] leading-relaxed">
        <AnnotatedText
          text={plainText}
          annotations={activeAnnotations}
          blockId={block.block_id}
          blockIndex={index}
          blocks={blocks}
          chapterId={chapterId}
          notesData={notesData}
        />
      </div>
    </blockquote>
  )
}
