import { NoteCardData } from "../../reading/components/UnifiedNoteCard"

export interface NoteDocumentItem {
  id: string
  title: string
  updatedAt: string
  projectId?: string
  projectName?: string
  blocks: Array<{
    id: string
    type: "text" | "note_card"
    content?: string
    noteData?: NoteCardData
  }>
}

export function generateMarkdownFromDocument(doc: NoteDocumentItem): string {
  const lines: string[] = []

  lines.push(`# ${doc.title || "无标题融合笔记"}`)
  lines.push(`> 导出时间: ${new Date().toLocaleString()} ${doc.projectName ? `| 所属知识工程: ${doc.projectName}` : ""}`)
  lines.push("")

  doc.blocks.forEach((block, index) => {
    if (block.type === "text" && block.content?.trim()) {
      lines.push(block.content)
      lines.push("")
    } else if (block.type === "note_card" && block.noteData) {
      const note = block.noteData
      lines.push(`### 笔记卡片 ${index + 1} (${note.anchor || "引文片段"})`)
      if (note.quote) {
        lines.push(`> **划选原文**: ${note.quote}`)
        lines.push("")
      }
      if (note.content) {
        lines.push(`**思考感悟**: ${note.content}`)
        lines.push("")
      }
      lines.push("---")
      lines.push("")
    }
  })

  return lines.join("\n")
}

export function downloadMarkdownFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", `${filename.endsWith(".md") ? filename : `${filename}.md`}`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
