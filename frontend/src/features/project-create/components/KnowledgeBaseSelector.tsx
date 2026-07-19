import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Library, ChevronDown, Check, Folder } from "lucide-react"
import { MOCK_KNOWLEDGE_BASES, MockKnowledgeBase } from "../mock"

export interface KnowledgeBaseSelectorProps {
  selectedKbId: string
  onSelectKb: (kbId: string, kbName: string) => void
}

export function KnowledgeBaseSelector({
  selectedKbId,
  onSelectKb,
}: KnowledgeBaseSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedKb =
    MOCK_KNOWLEDGE_BASES.find((item) => item.id === selectedKbId) ||
    MOCK_KNOWLEDGE_BASES[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSelect = (kb: MockKnowledgeBase) => {
    onSelectKb(kb.id, kb.name)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="text-xs text-slate-300 mb-1.5 flex items-center justify-between font-medium">
        <span className="flex items-center gap-1.5">
          <Library size={13} className="text-cyan-400" />
          <span>绑定所属知识库</span>
        </span>
        <span className="text-[11px] text-slate-500">归档与分类管理</span>
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg border bg-slate-900/90 transition-all cursor-pointer text-left ${
          isOpen
            ? "border-cyan-500/60 ring-1 ring-cyan-500/40 text-slate-100"
            : "border-slate-700/80 text-slate-200 hover:border-slate-600"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Folder size={14} className="text-cyan-400 shrink-0" />
          <span className="truncate font-medium">{selectedKb.name}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-cyan-400" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-50 p-1 bg-[#0c111d] border border-cyan-500/30 rounded-xl shadow-xl shadow-cyan-950/40 max-h-56 overflow-y-auto space-y-0.5 [scrollbar-width:thin]"
          >
            {MOCK_KNOWLEDGE_BASES.map((kb) => {
              const isSelected = kb.id === selectedKbId
              return (
                <button
                  key={kb.id}
                  type="button"
                  onClick={() => handleSelect(kb)}
                  className={`w-full flex items-start justify-between p-2 rounded-lg text-xs transition-all cursor-pointer text-left ${
                    isSelected
                      ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 font-semibold"
                      : "text-slate-300 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Folder
                        size={13}
                        className={
                          isSelected ? "text-cyan-400" : "text-slate-400"
                        }
                      />
                      <span className="truncate">{kb.name}</span>
                    </div>
                    {kb.description && (
                      <p className="text-[11px] text-slate-500 truncate pl-4">
                        {kb.description}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <Check size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
