import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, Bookmark, Sparkles } from "lucide-react"
import { useFloatingMenuStore as useFloatingMenu } from "../../shared/store"

interface ReadingSelectionToolbarProps {
  onDiscuss: (text: string) => void
  onCreateNote: (text: string) => void
  onExtractSkill: (scopeType: "L1" | "L2", text: string) => void
}

export function ReadingSelectionToolbar({
  onDiscuss,
  onCreateNote,
  onExtractSkill,
}: ReadingSelectionToolbarProps) {
  const menu = useFloatingMenu((s) => s.menu)
  const setFloatingMenu = useFloatingMenu((s) => s.setMenu)

  // 键盘 Escape 快捷键关闭选区菜单闭环处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFloatingMenu(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setFloatingMenu])

  return (
    <AnimatePresence>
      {menu && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.12 }}
          className="absolute z-50 bg-[#121A29] border border-slate-700/90 rounded-xl shadow-2xl px-2 py-1.5 flex items-center gap-1 backdrop-blur-lg"
          style={{
            left: menu.x - 110,
            top: menu.y,
          }}
        >
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-200 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-lg transition-all cursor-pointer font-semibold"
            onClick={() => onDiscuss(menu.text)}
          >
            <MessageSquare size={13} className="text-cyan-400" />
            提问 AI
          </button>

          <div className="w-px h-4 bg-slate-700/80" />

          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-200 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-all cursor-pointer font-semibold"
            onClick={() => onCreateNote(menu.text)}
          >
            <Bookmark size={13} className="text-emerald-400" />
            记笔记
          </button>

          <div className="w-px h-4 bg-slate-700/80" />

          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-200 hover:text-violet-300 hover:bg-violet-500/20 rounded-lg transition-all cursor-pointer font-semibold"
            onClick={() => onExtractSkill("L1", menu.text)}
          >
            <Sparkles size={13} className="text-violet-400" />
            提炼技能
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
