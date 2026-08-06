import { Lightbulb } from "lucide-react"
import { ContentBlockDO, TextAnnotation } from "../../../../../entities"
import { cn } from "../../../../../shared/utils/cn"
import { AnnotatedText } from "../AnnotatedText"

interface CalloutBlockProps {
  block: ContentBlockDO
  index: number
  isTargeted: boolean
  activeAnnotations: TextAnnotation[]
  blocks: ContentBlockDO[]
  chapterId?: string
  notesData?: any
}

export function CalloutBlock({
  block,
  index,
  isTargeted,
  activeAnnotations,
  blocks,
  chapterId,
  notesData,
}: CalloutBlockProps) {
  const plainText = block.text || ""

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
        </div>
      </div>
    </div>
  )
}
