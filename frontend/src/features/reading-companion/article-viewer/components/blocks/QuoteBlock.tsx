import { Quote } from "lucide-react"
import { ContentBlockDO, TextAnnotation } from "../../../../../entities"
import { cn } from "../../../../../shared/utils/cn"
import { AnnotatedText } from "../AnnotatedText"
import { ImageBlock } from "./ImageBlock"
import { TableBlock } from "./TableBlock"
import { ListBlock } from "./ListBlock"
import { CodeBlock } from "./CodeBlock"

export interface QuoteBlockItem {
  block: ContentBlockDO
  index: number
}

interface QuoteBlockProps {
  quoteItems?: QuoteBlockItem[]
  block?: ContentBlockDO
  index?: number
  bookId?: string
  targetAnchor?: string | null
  activeAnnotations: TextAnnotation[]
  blocks: ContentBlockDO[]
  chapterId?: string
  notesData?: any
  copiedCode?: boolean
  onCopyFormulaCode?: (code: string) => void
}

export function QuoteBlock({
  quoteItems,
  block,
  index = 0,
  bookId,
  targetAnchor,
  activeAnnotations,
  blocks,
  chapterId,
  notesData,
  copiedCode = false,
  onCopyFormulaCode = () => { },
}: QuoteBlockProps) {
  const items: QuoteBlockItem[] =
    quoteItems && quoteItems.length > 0
      ? quoteItems
      : block
        ? [{ block, index }]
        : []

  if (items.length === 0) return null

  const firstBlock = items[0].block
  const firstIndex = items[0].index

  const cleanTarget = targetAnchor ? (targetAnchor.split(" · ").pop() || targetAnchor).trim() : ""
  const isTargeted = items.some(({ block: itemBlock }) => {
    const text = itemBlock.text || ""
    return (
      Boolean(cleanTarget) &&
      (itemBlock.block_id === cleanTarget ||
        (Boolean(text) && text.includes(cleanTarget)) ||
        (cleanTarget.length >= 4 && Boolean(text) && text.includes(cleanTarget.slice(0, 15))))
    )
  })

  return (
    <blockquote
      key={firstBlock.block_id || firstIndex}
      id={firstBlock.block_id}
      data-block-id={firstBlock.block_id}
      data-block-index={firstIndex}
      className={cn(
        "my-5 p-3.5 md:p-4 transition-all duration-500 relative group flex items-start gap-2.5 select-text rounded-r-lg rounded-l-xs",
        "bg-slate-900/40 dark:bg-slate-950/40 border border-slate-800/40 border-l-[3px] border-l-amber-500/50 dark:border-l-amber-500/40 backdrop-blur-xs",
        isTargeted && "ring-2 ring-cyan-400 bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
      )}
    >
      <Quote size={15} className="text-amber-500/60 shrink-0 mt-1 select-none" />
      <div className="min-w-0 flex-1 text-[14.5px] md:text-[15px] text-slate-400/90 leading-relaxed space-y-3 font-normal">
        {items.map(({ block: itemBlock, index: itemIdx }) => {
          const type = itemBlock.block_type.toLowerCase()

          // 1. 图片节点 (QUOTE_IMAGE)
          if (type.includes("img") || type.includes("image") || type.includes("figure") || type.includes("photo")) {
            return (
              <div key={itemBlock.block_id || itemIdx} className="my-1.5 rounded-lg overflow-hidden border border-slate-800/50 shadow-xs">
                <ImageBlock block={itemBlock} index={itemIdx} bookId={bookId} />
              </div>
            )
          }

          // 2. 表格节点 (QUOTE_TABLE)
          if (type.includes("table") || type.includes("grid") || type.includes("tabular")) {
            return (
              <div
                key={itemBlock.block_id || itemIdx}
                className="my-1.5 rounded-lg border border-slate-800/50 bg-slate-950/30 p-2 overflow-x-auto [&_table]:my-0 [&_table]:text-[13px] [&_td]:py-1 [&_th]:py-1 [&_td]:text-slate-400 [&_th]:text-slate-300"
              >
                <TableBlock block={itemBlock} index={itemIdx} />
              </div>
            )
          }

          // 3. 代码/公式节点 (QUOTE_CODE)
          if (type.includes("code") || type.includes("formula") || type.includes("math")) {
            return (
              <div
                key={itemBlock.block_id || itemIdx}
                className="my-1.5 rounded-lg border border-slate-800/60 bg-slate-950/70 shadow-xs overflow-hidden [&_pre]:my-0 [&_pre]:p-3 [&_pre]:text-[13px] md:[&_pre]:text-[13.5px] [&_pre]:font-mono [&_pre]:bg-transparent"
              >
                <CodeBlock
                  block={itemBlock}
                  index={itemIdx}
                  copiedCode={copiedCode}
                  onCopyFormulaCode={onCopyFormulaCode}
                />
              </div>
            )
          }

          // 4. 列表节点 (QUOTE_LIST)
          if (type.includes("list") || type.includes("ul") || type.includes("ol")) {
            return (
              <div
                key={itemBlock.block_id || itemIdx}
                className="my-1 [&_ul]:my-0 [&_ol]:my-0 [&_li]:mb-1 [&_li]:text-[14.5px] [&_li]:text-slate-400/90 [&_li]:leading-relaxed"
              >
                <ListBlock
                  block={itemBlock}
                  index={itemIdx}
                  isTargeted={false}
                  activeAnnotations={activeAnnotations}
                  blocks={blocks}
                  chapterId={chapterId}
                  notesData={notesData}
                />
              </div>
            )
          }

          // 5. 普通引用文本段落 (QUOTE / QUOTE_PARAGRAPH)
          const plainText = itemBlock.text || (itemBlock.html_or_markdown ? itemBlock.html_or_markdown.replace(/^\s*>\s?/gm, "") : "")
          return (
            <div key={itemBlock.block_id || itemIdx} className="whitespace-pre-wrap leading-relaxed text-slate-400/90 font-normal">
              <AnnotatedText
                text={plainText}
                annotations={activeAnnotations}
                blockId={itemBlock.block_id}
                blockIndex={itemIdx}
                blocks={blocks}
                chapterId={chapterId}
                notesData={notesData}
              />
            </div>
          )
        })}
      </div>
    </blockquote>
  )
}


