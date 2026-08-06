import React from "react"
import { type TextAnnotation, type ContentBlockDO } from "../../../../entities"
import { useFloatingMenuStore as useFloatingMenu } from "../../../../shared/store"
import { cn } from "../../../../shared/utils/cn"
import { RawMatch } from "../types"
import { buildCombinedMatches } from "../utils/annotationMatcher"
import { AnnotationPopover } from "./AnnotationPopover"

interface AnnotatedTextProps {
  text: string
  annotations: TextAnnotation[]
  blockId?: string
  blockIndex?: number
  blocks: ContentBlockDO[]
  chapterId?: string
  notesData?: {
    items?: Array<{
      source_anchor?: {
        start_offset?: number
        end_offset?: number
        chapter_id?: string
      }
      user_interpretation?: string
    }>
  }
}

function renderInlineMarkdown(str: string): React.ReactNode {
  if (!str) return str
  if (!str.includes("`") && !str.includes("**")) return str

  const parts = str.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  if (parts.length <= 1) return str

  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
          const codeContent = part.slice(1, -1)
          return (
            <code
              key={idx}
              className="px-1.5 py-0.5 mx-0.5 rounded text-xs md:text-sm font-mono bg-slate-800/90 text-cyan-300 border border-slate-700/60 font-medium inline-block align-baseline leading-none shadow-xs"
            >
              {codeContent}
            </code>
          )
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
          const boldContent = part.slice(2, -2)
          return (
            <strong key={idx} className="font-bold text-slate-100 dark:text-slate-100 px-0.5">
              {boldContent}
            </strong>
          )
        }
        return part
      })}
    </>
  )
}

export function AnnotatedText({
  text,
  annotations,
  blockId,
  blockIndex,
  blocks,
  chapterId,
  notesData,
}: AnnotatedTextProps) {
  const menu = useFloatingMenu((s: any) => s.menu)
  const isWritingNote = useFloatingMenu((s: any) => s.isWritingNote)

  if (!text) return <>{text}</>

  const rawMatches: RawMatch[] = []

  // 1. 收集真实的素材读书笔记
  const items = notesData?.items || []

  // 计算当前 Block 在整章文本中的绝对物理 offset 范围
  let currentBlockStartOffset = 0
  if (typeof blockIndex === "number" && blocks && blockIndex > 0) {
    for (let i = 0; i < blockIndex && i < blocks.length; i++) {
      currentBlockStartOffset += (blocks[i].text || "").length + 1
    }
  }
  const currentBlockEndOffset = currentBlockStartOffset + text.length

  items.forEach((item) => {
    const anchor = item.source_anchor
    // 优先使用 source_anchor 绝对字符偏移精确匹配
    if (
      anchor &&
      typeof anchor.start_offset === "number" &&
      typeof anchor.end_offset === "number" &&
      anchor.end_offset > anchor.start_offset &&
      (!anchor.chapter_id || anchor.chapter_id === chapterId)
    ) {
      const noteStart = anchor.start_offset
      const noteEnd = anchor.end_offset

      // 计算笔记全局区间与当前 Block 区间的重叠交集
      const overlapStart = Math.max(noteStart, currentBlockStartOffset)
      const overlapEnd = Math.min(noteEnd, currentBlockEndOffset)

      if (overlapStart < overlapEnd) {
        const relStart = overlapStart - currentBlockStartOffset
        const relEnd = overlapEnd - currentBlockStartOffset

        if (relStart >= 0 && relEnd <= text.length && relStart < relEnd) {
          const matchText = text.substring(relStart, relEnd)
          const isDuplicate = rawMatches.some(
            (m) => m.category === "user-note" && m.start === relStart && m.end === relEnd
          )
          if (!isDuplicate) {
            rawMatches.push({
              start: relStart,
              end: relEnd,
              text: matchText,
              category: "user-note",
              explanation: item.user_interpretation,
            })
          }
        }
      }
    }
  })

  // 1.5. 收集当前选中的临时文本高亮（基于精确的 blockId 和偏移下标）
  if (isWritingNote && menu && menu.text) {
    // 起点 Block：用精确 startOffset/endOffset 高亮
    if (menu.blockId === blockId) {
      const start = menu.startOffset
      const end = menu.endOffset
      if (start >= 0 && end <= text.length && start < end) {
        const isDuplicate = rawMatches.some(
          (m) => m.category === "temp-selection" && m.start === start && m.end === end
        )
        if (!isDuplicate) {
          rawMatches.push({ start, end, text: menu.text, category: "temp-selection" })
        }
      }
    }

    // 中间 Block（3+ Block 跨段时）：中间的 Block 被完全选中，直接高亮整段
    if (menu.middleBlockIds?.includes(blockId || "")) {
      const isDuplicate = rawMatches.some(
        (m) => m.category === "temp-selection" && m.start === 0 && m.end === text.length
      )
      if (!isDuplicate && text.length > 0) {
        rawMatches.push({ start: 0, end: text.length, text, category: "temp-selection" })
      }
    }

    // 终点 Block（跨 Block 时）：从 menu.text 分割出属于本 Block 的部分，用 indexOf 匹配高亮
    if (menu.endBlockId && menu.endBlockId === blockId) {
      const parts = menu.text.split("\n").map((p: string) => p.trim()).filter((p: string) => p.length >= 2)
      const lastPart = parts[parts.length - 1]
      if (lastPart) {
        const idx = text.indexOf(lastPart)
        if (idx !== -1) {
          const isDuplicate = rawMatches.some(
            (m) => m.category === "temp-selection" && m.start === idx && m.end === idx + lastPart.length
          )
          if (!isDuplicate) {
            rawMatches.push({ start: idx, end: idx + lastPart.length, text: lastPart, category: "temp-selection" })
          }
        }
      }
    }
  }

  // 2. 收集 AI 标注
  if (annotations && annotations.length > 0) {
    annotations.forEach((ann) => {
      if (!ann.text) return
      let searchIdx = 0
      while (searchIdx < text.length) {
        const idx = text.indexOf(ann.text, searchIdx)
        if (idx === -1) break
        rawMatches.push({
          start: idx,
          end: idx + ann.text.length,
          text: ann.text,
          category: ann.category,
          explanation: ann.explanation,
        })
        searchIdx = idx + ann.text.length
      }
    })
  }

  if (rawMatches.length === 0) return <>{renderInlineMarkdown(text)}</>

  const combinedMatches = buildCombinedMatches(text, rawMatches)

  const nodes: React.ReactNode[] = []
  let lastPos = 0

  combinedMatches.forEach((cm, index) => {
    if (cm.start > lastPos) {
      nodes.push(renderInlineMarkdown(text.substring(lastPos, cm.start)))
    }

    const key = `combined-${cm.start}-${index}`
    const hasUserNote = Boolean(cm.userNote)
    const primaryAI = cm.aiAnnotations[0]

    const hasTempSelection = Boolean(cm.tempSelection)
    const isUserAnnotated = hasUserNote || hasTempSelection

    // 1. 用户划线笔记：提供清爽纯净的暖金底衬
    const userHighlightClass = isUserAnnotated
      ? "bg-amber-500/20 text-amber-100 font-medium rounded-xs px-1 py-0.5"
      : ""

    // 2. AI 标注修饰：采用下划线 + 精致分类微底纹
    let underlineClass = ""
    let aiBgClass = ""
    if (primaryAI) {
      if (primaryAI.category === "concept") {
        underlineClass = "underline decoration-emerald-400 decoration-[2px] underline-offset-[5px]"
        aiBgClass = "bg-emerald-500/12 text-emerald-100 px-0.5 rounded-xs"
      } else if (primaryAI.category === "conclusion") {
        underlineClass = "underline decoration-violet-400 decoration-[2px] underline-offset-[5px]"
        aiBgClass = "bg-violet-500/12 text-violet-100 px-0.5 rounded-xs"
      } else if (primaryAI.category === "quote") {
        underlineClass = "underline decoration-cyan-400 decoration-[2px] underline-offset-[5px]"
        aiBgClass = "bg-cyan-500/12 text-cyan-100 px-0.5 rounded-xs"
      } else if (primaryAI.category === "contrast") {
        underlineClass = "underline decoration-wavy decoration-teal-400 decoration-[2px] underline-offset-[5px]"
        aiBgClass = "bg-teal-500/12 text-teal-100 px-0.5 rounded-xs"
      }
    }

    if (hasUserNote && !underlineClass) {
      const overlappingAI = rawMatches.find(
        (r) =>
          r.category !== "user-note" &&
          r.category !== "temp-selection" &&
          r.start <= cm.start &&
          r.end >= cm.end
      )
      if (overlappingAI) {
        if (overlappingAI.category === "concept") {
          underlineClass = "underline decoration-emerald-400 decoration-[2px] underline-offset-[5px]"
        } else if (overlappingAI.category === "conclusion") {
          underlineClass = "underline decoration-violet-400 decoration-[2px] underline-offset-[5px]"
        } else if (overlappingAI.category === "quote") {
          underlineClass = "underline decoration-cyan-400 decoration-[2px] underline-offset-[5px]"
        } else if (overlappingAI.category === "contrast") {
          underlineClass = "underline decoration-wavy decoration-teal-400 decoration-[2px] underline-offset-[5px]"
        }
      }
    }

    const contentElement = (
      <span
        className={cn(
          "inline transition-colors duration-150",
          (hasUserNote || primaryAI) && "cursor-pointer",
          userHighlightClass,
          !isUserAnnotated && aiBgClass,
          underlineClass
        )}
      >
        {renderInlineMarkdown(cm.text)}
      </span>
    )

    // 只有在拥有真实读书笔记或 AI 解析且当前无选区/写笔记菜单激活时，才启用 Popover 悬浮气泡
    const hasOverlappingAI =
      hasUserNote &&
      rawMatches.some(
        (r) =>
          r.category !== "user-note" && r.category !== "temp-selection" && r.start <= cm.start && r.end >= cm.end
      )
    const shouldShowPopover = (hasUserNote || cm.aiAnnotations.length > 0 || hasOverlappingAI) && !menu

    // 判断当前段落是否偏向顶部
    const isTopBlock = blockIndex !== undefined && blockIndex <= 1

    if (shouldShowPopover) {
      nodes.push(
        <span key={key} className="relative group inline cursor-pointer">
          {contentElement}
          <AnnotationPopover cm={cm} isTopBlock={isTopBlock} />
        </span>
      )
    } else {
      nodes.push(<span key={key}>{contentElement}</span>)
    }

    lastPos = cm.end
  })

  if (lastPos < text.length) {
    nodes.push(renderInlineMarkdown(text.substring(lastPos)))
  }

  return <>{nodes}</>
}


