import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Library,
  Search,
  X,
  PanelLeftClose,
  FolderSearch,
} from "lucide-react"

export type KnowledgeDrawerMode = "all" | "favorites" | "recent"

export interface KnowledgeBaseTreeDrawerProps {
  isOpen: boolean
  onClose: () => void
  mode?: KnowledgeDrawerMode
}

export function KnowledgeBaseTreeDrawer({
  isOpen,
  onClose,
  mode = "all",
}: KnowledgeBaseTreeDrawerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const currentMode = mode

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="h-full border-r border-white/10 bg-[#0a0e17] flex flex-col shrink-0 overflow-hidden select-none z-30 relative"
          role="region"
          aria-label="知识库目录抽屉"
        >
          <div className="w-full h-full flex flex-col shrink-0 overflow-hidden">
            {/* Header */}
            <div className="px-3.5 h-13 border-b border-white/10 bg-slate-900/40 backdrop-blur-sm flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Library size={15} />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-200 tracking-wide uppercase truncate">
                  知识库目录 ({currentMode})
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                title="收起知识库目录"
                aria-label="收起知识库目录"
              >
                <PanelLeftClose size={15} />
              </button>
            </div>

            {/* Search Box */}
            <div className="px-3 py-2.5 shrink-0 border-b border-white/5 bg-slate-950/20">
              <div className="relative flex items-center">
                <Search
                  size={14}
                  className="absolute left-2.5 text-slate-500 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索知识库文档..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
                    title="清空搜索"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Tree Stream */}
            <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1.5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2">
                <div className="p-3 rounded-full bg-white/5 text-slate-500 border border-white/5">
                  <FolderSearch size={22} />
                </div>
                <span className="text-xs sm:text-sm text-slate-400 font-medium">
                  暂无符合条件的知识库项目
                </span>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
