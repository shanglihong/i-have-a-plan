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
    </h2>
  )
}
