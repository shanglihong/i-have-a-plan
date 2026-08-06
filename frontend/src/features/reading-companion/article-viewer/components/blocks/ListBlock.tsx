import { ContentBlockDO, TextAnnotation } from "../../../../../entities"
import { cn } from "../../../../../shared/utils/cn"
import { AnnotatedText } from "../AnnotatedText"

interface ListBlockProps {
  block: ContentBlockDO
  index: number
  isTargeted: boolean
  activeAnnotations: TextAnnotation[]
  blocks: ContentBlockDO[]
  chapterId?: string
  notesData?: any
}

export function ListBlock({
  block,
  index,
  isTargeted,
  activeAnnotations,
  blocks,
  chapterId,
  notesData,
}: ListBlockProps) {
  const rawText = block.text || ""
  const lines = rawText.split("\n").filter((line) => line.trim().length > 0)

  // 默认 fallback：若无多行文本，直接渲染整段
  if (lines.length === 0) {
    lines.push(rawText)
  }

  return (
    <div
      key={block.block_id || index}
      id={block.block_id}
      data-block-id={block.block_id}
      data-block-index={index}
      className={cn(
        "my-4 p-3 sm:p-4 rounded-xl transition-all duration-500 bg-slate-900/40 border border-slate-800/60",
        isTargeted && "ring-2 ring-cyan-400 bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
      )}
    >
      <ul className="space-y-3 text-slate-300">
        {lines.map((line, itemIdx) => {
          // 正则匹配前缀标号 (例如 "• ", "1. ", "5. ", "- ", "* ")
          const match = line.match(/^(\s*(?:•|\*|-|\d+\.))\s*(.*)$/)
          let prefix = ""
          let itemContent = line

          if (match) {
            prefix = match[1].trim()
            itemContent = match[2]
          }

          const isNumbered = /^\d+\.?$/.test(prefix)
          const displayPrefix = isNumbered ? prefix.replace(/\.$/, "") : prefix

          // 判断正文中是否存在冒号（中英文冒号：或 :），若是则对冒号前的内容加粗凸显
          const colonMatch = itemContent.match(/^([^：:]{1,50}[：:])\s*(.*)$/)
          const titlePart = colonMatch ? colonMatch[1] : ""
          const bodyPart = colonMatch ? colonMatch[2] : itemContent

          return (
            <li
              key={itemIdx}
              className="flex items-start gap-3 text-[15px] xl:text-[17px] 2xl:text-[18px] leading-[1.85] group"
            >
              {/* 前缀点/序号徽章 */}
              {isNumbered ? (
                <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 rounded px-1.5 py-0.5 mt-1 shrink-0 select-none">
                  {displayPrefix}
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-cyan-400 mt-3 shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.6)] group-hover:scale-125 transition-transform duration-300" />
              )}

              {/* 列表项正文 (冒号前文本加粗，支持 AI 标注与划线笔记) */}
              <div className="flex-1 min-w-0">
                {titlePart ? (
                  <>
                    <span className="font-bold text-slate-100 select-text">
                      <AnnotatedText
                        text={titlePart}
                        annotations={activeAnnotations}
                        blockId={block.block_id}
                        blockIndex={index}
                        blocks={blocks}
                        chapterId={chapterId}
                        notesData={notesData}
                      />
                    </span>
                    {bodyPart && (
                      <span className="ml-1">
                        <AnnotatedText
                          text={bodyPart}
                          annotations={activeAnnotations}
                          blockId={block.block_id}
                          blockIndex={index}
                          blocks={blocks}
                          chapterId={chapterId}
                          notesData={notesData}
                        />
                      </span>
                    )}
                  </>
                ) : (
                  <AnnotatedText
                    text={itemContent}
                    annotations={activeAnnotations}
                    blockId={block.block_id}
                    blockIndex={index}
                    blocks={blocks}
                    chapterId={chapterId}
                    notesData={notesData}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
