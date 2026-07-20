import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Download,
  Plus,
  Trash2,
  FileText,
  Bookmark,
  Share2,
  Check,
  MoveUp,
  MoveDown,
  PanelLeftOpen,
} from "lucide-react"
import { NoteCardData, UnifiedNoteCard } from "../../reading/components/UnifiedNoteCard"
import { NoteDocumentItem, downloadMarkdownFile, generateMarkdownFromDocument } from "../utils/exportUtils"

interface NoteDocumentEditorProps {
  document: NoteDocumentItem
  onUpdateDocument: (updated: NoteDocumentItem) => void
  onOpenNotesPicker: () => void
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function NoteDocumentEditor({
  document,
  onUpdateDocument,
  onOpenNotesPicker,
  isSidebarCollapsed = false,
  onToggleSidebar,
}: NoteDocumentEditorProps) {
  const navigate = useNavigate()
  const [copiedExport, setCopiedExport] = useState(false)

  const handleTitleChange = (newTitle: string) => {
    onUpdateDocument({
      ...document,
      title: newTitle,
      updatedAt: "刚刚",
    })
  }

  const handleBlockContentChange = (blockId: string, text: string) => {
    const updatedBlocks = document.blocks.map((b) =>
      b.id === blockId ? { ...b, content: text } : b,
    )
    onUpdateDocument({
      ...document,
      blocks: updatedBlocks,
      updatedAt: "刚刚",
    })
  }

  const handleAddTextBlock = () => {
    const newBlock = {
      id: `block_${Date.now()}`,
      type: "text" as const,
      content: "",
    }
    onUpdateDocument({
      ...document,
      blocks: [...document.blocks, newBlock],
      updatedAt: "刚刚",
    })
  }

  const handleDeleteBlock = (blockId: string) => {
    onUpdateDocument({
      ...document,
      blocks: document.blocks.filter((b) => b.id !== blockId),
      updatedAt: "刚刚",
    })
  }

  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= document.blocks.length) return

    const newBlocks = [...document.blocks]
    const temp = newBlocks[index]
    newBlocks[index] = newBlocks[targetIndex]
    newBlocks[targetIndex] = temp

    onUpdateDocument({
      ...document,
      blocks: newBlocks,
      updatedAt: "刚刚",
    })
  }

  const handleExportMarkdown = () => {
    const mdText = generateMarkdownFromDocument(document)
    downloadMarkdownFile(document.title || "fusion_notes", mdText)
  }

  const handleCopyMarkdown = () => {
    const mdText = generateMarkdownFromDocument(document)
    navigator.clipboard.writeText(mdText)
    setCopiedExport(true)
    setTimeout(() => setCopiedExport(false), 2000)
  }

  const handleTraceNoteToReadingPage = (note: NoteCardData) => {
    const projId = document.projectId || "1"
    navigate(`/project/read/${projId}?anchor=${encodeURIComponent(note.anchor)}`)
  }

  return (
    <div className="h-full flex flex-col min-w-0 bg-[#090D16] font-sans">
      {/* ── Document Header Toolbar (Aligned with Sidebar Header: h-14, border-white/10) ── */}
      <div className="px-4 sm:px-6 h-14 border-b border-white/10 bg-slate-900/40 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-3 sm:mr-6">
          {isSidebarCollapsed && onToggleSidebar && (
            <>
              <button
                onClick={onToggleSidebar}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0"
                title="展开知识库目录侧边栏"
                aria-label="展开侧边栏"
              >
                <PanelLeftOpen size={16} />
              </button>
              <div className="w-[1px] h-4 bg-white/10 shrink-0 mx-0.5" />
            </>
          )}

          <FileText size={17} className="text-cyan-400 shrink-0" />
          <input
            type="text"
            value={document.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="知识输出文档标题..."
            className="flex-1 min-w-0 w-full bg-transparent text-sm sm:text-base font-bold text-slate-100 focus:outline-none border-b border-transparent focus:border-cyan-500/50 truncate transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenNotesPicker}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Bookmark size={13} />
            <span>引入精读素材</span>
          </button>

          <button
            onClick={handleAddTextBlock}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <Plus size={13} />
            <span>增加思考段落</span>
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
            title="复制 Markdown"
          >
            {copiedExport ? <Check size={15} className="text-emerald-400" /> : <Share2 size={15} />}
          </button>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all cursor-pointer shadow-md shadow-cyan-500/10"
            title="导出为 Markdown 文件"
          >
            <Download size={13} />
            <span>导出 Markdown</span>
          </button>
        </div>
      </div>

      {/* ── Main Document Canvas Stream ── */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-4xl w-full mx-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        <AnimatePresence>
          {document.blocks.map((block, index) => (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group relative flex items-start gap-2"
            >
              {/* Block Move / Delete Side Controls */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 pt-2 shrink-0">
                <button
                  onClick={() => handleMoveBlock(index, "up")}
                  disabled={index === 0}
                  className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                  title="向上移动"
                >
                  <MoveUp size={12} />
                </button>
                <button
                  onClick={() => handleMoveBlock(index, "down")}
                  disabled={index === document.blocks.length - 1}
                  className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                  title="向下移动"
                >
                  <MoveDown size={12} />
                </button>
                <button
                  onClick={() => handleDeleteBlock(block.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                  title="删除该块"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Block Body */}
              <div className="flex-1 min-w-0">
                {block.type === "text" ? (
                  <div className="p-4 rounded-2xl bg-[#0F172A]/40 border border-slate-800/60 focus-within:border-cyan-500/40 transition-all shadow-inner">
                    <textarea
                      value={block.content || ""}
                      onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                      placeholder="写下串联推导思考、知识关联或方法论总结 (支持 Markdown 语法)..."
                      rows={3}
                      className="w-full bg-transparent text-sm leading-relaxed text-slate-200 placeholder:text-slate-500 focus:outline-none resize-none"
                    />
                  </div>
                ) : (
                  block.noteData && (
                    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/10 p-1">
                      <UnifiedNoteCard
                        note={block.noteData}
                        onTraceAnchor={() => handleTraceNoteToReadingPage(block.noteData!)}
                      />
                    </div>
                  )
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {document.blocks.length === 0 && (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
            <FileText size={36} className="text-slate-700" />
            <div className="text-sm font-medium">当前知识输出文档为空</div>
            <div className="text-xs text-slate-600">
              点击上方“引入精读素材”或“增加思考段落”开始知识总结与输出
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
