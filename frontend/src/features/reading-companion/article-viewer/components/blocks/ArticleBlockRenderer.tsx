import { ContentBlockDO, TextAnnotation } from "../../../../../entities"
import { HeadingBlock } from "./HeadingBlock"
import { CodeBlock } from "./CodeBlock"
import { CalloutBlock } from "./CalloutBlock"
import { ParagraphBlock } from "./ParagraphBlock"
import { ImageBlock } from "./ImageBlock"
import { TableBlock } from "./TableBlock"

interface ArticleBlockRendererProps {
  block: ContentBlockDO
  index: number
  targetAnchor: string | null
  activeAnnotations: TextAnnotation[]
  blocks: ContentBlockDO[]
  chapterId?: string
  notesData?: any
  copiedCode: boolean
  onCopyFormulaCode: (code: string) => void
}

export function ArticleBlockRenderer({
  block,
  index,
  targetAnchor,
  activeAnnotations,
  blocks,
  chapterId,
  notesData,
  copiedCode,
  onCopyFormulaCode,
}: ArticleBlockRendererProps) {
  const type = block.block_type.toLowerCase()
  const plainText = block.text || ""
  const cleanTarget = targetAnchor ? (targetAnchor.split(" · ").pop() || targetAnchor).trim() : ""
  const isTargeted =
    Boolean(cleanTarget) &&
    (block.block_id === cleanTarget ||
      (Boolean(plainText) && plainText.includes(cleanTarget)) ||
      (cleanTarget.length >= 4 && Boolean(plainText) && plainText.includes(cleanTarget.slice(0, 15))))

  // 1. 图片节点 (Image / Figure) — 优先使用 html_or_markdown
  if (type.includes("img") || type.includes("image") || type.includes("figure") || type.includes("photo")) {
    return <ImageBlock key={block.block_id || index} block={block} index={index} />
  }

  // 2. 表格节点 (Table / Grid) — 优先使用 html_or_markdown
  if (type.includes("table") || type.includes("grid") || type.includes("tabular")) {
    return <TableBlock key={block.block_id || index} block={block} index={index} />
  }

  // 3. 公式/代码块节点 (Formula / Code) — 优先使用 html_or_markdown
  if (type.includes("code") || type.includes("formula") || type.includes("math")) {
    return (
      <CodeBlock
        key={block.block_id || index}
        block={block}
        index={index}
        copiedCode={copiedCode}
        onCopyFormulaCode={onCopyFormulaCode}
      />
    )
  }

  // 4. 标题节点 (Heading) — 使用 block.text
  if (type.includes("heading") || type.includes("title") || type.includes("header")) {
    return (
      <HeadingBlock
        key={block.block_id || index}
        block={block}
        index={index}
        isTargeted={isTargeted}
        activeAnnotations={activeAnnotations}
        blocks={blocks}
        chapterId={chapterId}
        notesData={notesData}
      />
    )
  }

  // 5. 重点高亮/提示框节点 (Callout / Quote) — 使用 block.text
  if (type.includes("callout") || type.includes("quote") || type.includes("note")) {
    return (
      <CalloutBlock
        key={block.block_id || index}
        block={block}
        index={index}
        isTargeted={isTargeted}
        activeAnnotations={activeAnnotations}
        blocks={blocks}
        chapterId={chapterId}
        notesData={notesData}
      />
    )
  }

  // 6. 默认段落节点 (Paragraph) — 使用 block.text
  return (
    <ParagraphBlock
      key={block.block_id || index}
      block={block}
      index={index}
      isTargeted={isTargeted}
      activeAnnotations={activeAnnotations}
      blocks={blocks}
      chapterId={chapterId}
      notesData={notesData}
    />
  )
}
