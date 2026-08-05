import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, Bookmark, Sparkles } from "lucide-react"
import { useFloatingMenuStore as useFloatingMenu } from "../../shared/store"
import { READING_TOKENS } from "../../shared/constants"
import { cn } from "../../shared/utils/cn"

interface ReadingSelectionToolbarProps {
  onDiscuss: (text: string) => void
  onCreateNote: (text: string, interpretation?: string) => void
  onExtractSkill: (scopeType: "L1" | "L2", text: string) => void
}

export function ReadingSelectionToolbar({
  onDiscuss,
  onCreateNote,
  onExtractSkill,
}: ReadingSelectionToolbarProps) {
  const menu = useFloatingMenu((s) => s.menu)
  const setFloatingMenu = useFloatingMenu((s) => s.setMenu)

  const isWritingNote = useFloatingMenu((s) => s.isWritingNote)
  const setIsWritingNote = useFloatingMenu((s) => s.setIsWritingNote)
  const [noteInterpretation, setNoteInterpretation] = useState("")

  useEffect(() => {
    setNoteInterpretation("")
  }, [menu])

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

  const placement = menu?.placement || "top"

  return (
    <AnimatePresence>
      {menu && (
        <motion.div
          initial={{ opacity: 0, y: placement === "bottom" ? -6 : 6, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.12 }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          className={cn(
            "absolute z-50 -translate-x-1/2 backdrop-blur-xl transition-all duration-200",
            placement === "bottom" ? "translate-y-0" : "-translate-y-full",
            isWritingNote 
              ? "p-4 w-80 bg-slate-900/98 border border-slate-800/90 focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/10 shadow-2xl shadow-cyan-950/20 rounded-xl" 
              : "px-2 py-1.5 flex items-center gap-1 bg-[#121A29] border border-slate-700/90 rounded-2xl shadow-2xl"
          )}
          style={{
            left: menu.x,
            top: menu.y,
          }}
        >
          {isWritingNote ? (
            <div className="flex flex-col gap-3 w-full font-sans select-none">
              {/* Header Info */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 font-sans tracking-wide">
                <span className="flex items-center gap-1">
                  <Sparkles size={11} className="text-cyan-400/80 animate-pulse" />
                  <span>记读书想法</span>
                </span>
                <span className="text-[11px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded-sm">
                  {menu.text.length}字引用
                </span>
              </div>

              {/* Textarea Input - 剥离多余内边框，卡片直插极简输入模式 */}
              <textarea
                value={noteInterpretation}
                onChange={(e) => setNoteInterpretation(e.target.value)}
                placeholder="这一刻的想法是..."
                autoFocus
                style={{ outline: 'none', boxShadow: 'none' }}
                className={cn(
                  "w-full resize-none focus:outline-none min-h-[90px] max-h-[140px] text-xs sm:text-[13px] placeholder:text-slate-500 py-0.5 font-sans leading-relaxed",
                  READING_TOKENS.surface.inputControl
                )}
              />

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/40">
                <span className="text-[10px] text-slate-500 font-sans tracking-wider">
                  Esc 可退出
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsWritingNote(false)}
                    className="px-2.5 py-1 text-xs text-slate-300 hover:text-slate-100 transition-colors font-medium cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      onCreateNote(menu.text, noteInterpretation.trim())
                      setIsWritingNote(false)
                      setNoteInterpretation("")
                    }}
                    className="px-3 py-1 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-400/50 rounded-lg transition-all font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>保存</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                onClick={() => setIsWritingNote(true)}
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
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
