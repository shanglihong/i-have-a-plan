import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Plus, Bookmark, X, Quote, Sparkles } from "lucide-react"
import { NoteCardData } from "../../reading/components/UnifiedNoteCard"

interface NotesPickerDrawerProps {
  isOpen: boolean
  onClose: () => void
  availableNotes: NoteCardData[]
  onInsertNote: (note: NoteCardData) => void
}

export function NotesPickerDrawer({
  isOpen,
  onClose,
  availableNotes,
  onInsertNote,
}: NotesPickerDrawerProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredNotes = availableNotes.filter(
    (n) =>
      n.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.quote?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.anchor?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40"
          />

          {/* Right Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-[380px] max-w-[90vw] bg-[#0C111D] border-l border-slate-800 z-50 shadow-2xl flex flex-col font-sans"
          >
            {/* Header */}
            <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between bg-[#090D16]/80 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-100">选择精读素材</h3>
                <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  {filteredNotes.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-800/60 bg-[#090D16]/40 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索精读素材与原文..."
                  className="w-full bg-[#0F172A] border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
              {filteredNotes.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <Bookmark size={24} className="text-slate-700" />
                  <span>暂无匹配的划线精读素材</span>
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl bg-[#0F172A]/80 border border-slate-800/80 hover:border-cyan-500/40 transition-all group space-y-2 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                        {note.anchor}
                      </span>

                      <button
                        onClick={() => onInsertNote(note)}
                        className="flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-100 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs"
                      >
                        <Plus size={12} />
                        <span>引入</span>
                      </button>
                    </div>

                    {note.quote && (
                      <div className="px-2.5 py-1.5 bg-[#0C1A1A]/80 border-l-2 border-emerald-400 text-emerald-100 text-xs leading-relaxed flex items-start gap-1.5 rounded-r-md">
                        <Quote size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{note.quote}</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-200 leading-relaxed line-clamp-2">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
