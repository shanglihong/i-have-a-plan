import { ContentBlockDO } from "../../../../../entities"

interface TableBlockProps {
  block: ContentBlockDO
  index: number
}

/**
 * 将 GFM Markdown 表格语法转化为标准的 HTML <table> 结构
 */
export function parseMarkdownTableToHtml(content: string): string {
  if (!content) return ""

  const trimmed = content.trim()

  // 如果已经包含 <table> 或其他 HTML 标签，直接返回
  if (/<table[\s\S]*?>/i.test(trimmed)) {
    return trimmed
  }

  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return ""

  const tableLines = lines.filter((line) => line.includes("|"))
  if (tableLines.length < 2) {
    return trimmed
  }

  let headerRow: string[] = []
  let alignments: ("left" | "center" | "right")[] = []
  const dataRows: string[][] = []

  let foundSeparator = false

  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i]
    const cells = line.split("|").map((c) => c.trim())

    if (cells.length > 0 && cells[0] === "") cells.shift()
    if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop()

    const isSeparator = cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.replace(/\s+/g, "")))

    if (isSeparator) {
      foundSeparator = true
      alignments = cells.map((c) => {
        const str = c.replace(/\s+/g, "")
        if (str.startsWith(":") && str.endsWith(":")) return "center"
        if (str.endsWith(":")) return "right"
        return "left"
      })
    } else if (!foundSeparator && headerRow.length === 0) {
      headerRow = cells
    } else {
      dataRows.push(cells)
    }
  }

  if (headerRow.length === 0) {
    return trimmed
  }

  let html = `<table class="w-full border-collapse border border-slate-700 font-sans text-xs">`

  html += `<thead class="bg-slate-800/90 text-slate-200"><tr>`
  headerRow.forEach((cell, idx) => {
    const align = alignments[idx] || "left"
    const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
    html += `<th class="border border-slate-700 p-2.5 font-semibold ${alignClass}">${cell}</th>`
  })
  html += `</tr></thead>`

  html += `<tbody>`
  dataRows.forEach((row, rIdx) => {
    const bgClass = rIdx % 2 === 0 ? "bg-slate-900/40" : "bg-slate-900/80"
    html += `<tr class="${bgClass} hover:bg-slate-800/40 transition-colors">`
    row.forEach((cell, idx) => {
      const align = alignments[idx] || "left"
      const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      html += `<td class="border border-slate-800 p-2.5 text-slate-300 ${alignClass}">${cell}</td>`
    })
    html += `</tr>`
  })
  html += `</tbody></table>`

  return html
}

export function TableBlock({ block, index }: TableBlockProps) {
  const rawContent = block.html_or_markdown || block.text || ""
  const renderedHtml = parseMarkdownTableToHtml(rawContent)
  const isHtml = /<[a-z][\s\S]*>/i.test(renderedHtml)

  return (
    <div
      key={block.block_id || index}
      id={block.block_id}
      data-block-id={block.block_id}
      data-block-index={index}
      className="my-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-700 [&_th]:bg-slate-800/90 [&_th]:p-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-slate-200 [&_td]:border [&_td]:border-slate-800/80 [&_td]:p-2.5 [&_td]:text-xs [&_td]:text-slate-300"
    >
      {isHtml ? (
        <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      ) : (
        <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap">{rawContent}</pre>
      )}
    </div>
  )
}
