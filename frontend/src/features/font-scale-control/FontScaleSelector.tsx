import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, Type } from "lucide-react"
import { useClickOutside } from "../../shared/hooks/useClickOutside"
import { useFontScale } from "../../shared/hooks/useFontScale"

export function FontScaleSelector() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const { scaleLevel, currentOption, options, setScaleLevel } = useFontScale()

  useClickOutside(settingsRef, () => setSettingsOpen(false), settingsOpen)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && settingsOpen) {
        setSettingsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [settingsOpen])

  return (
    <div className="relative inline-block" ref={settingsRef}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setSettingsOpen((prev) => !prev)}
        aria-label="系统设置"
        aria-haspopup="true"
        aria-expanded={settingsOpen}
        title="系统设置"
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
          settingsOpen
            ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10"
            : "text-slate-400 hover:text-slate-100 hover:bg-white/10"
        }`}
      >
        <Settings
          size={18}
          className={`transition-transform duration-300 ${
            settingsOpen ? "rotate-90 text-cyan-300" : "group-hover:rotate-45"
          }`}
        />
        {scaleLevel !== "standard" && (
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-cyan-400 ring-2 ring-[#0c111d]" />
        )}
      </button>

      {/* 精简 Popover 面板 */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -8, y: 8 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -8, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="dialog"
            aria-label="设置面板"
            className="absolute left-16 bottom-0 z-50 w-72 bg-[#0f172a]/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl rounded-2xl p-3.5 text-slate-100 select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Type size={14} className="text-cyan-400" />
                <span>全局字号缩放</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium bg-cyan-500/15 text-cyan-300 rounded border border-cyan-500/20">
                {Math.round(currentOption.scale * 100)}%
              </span>
            </div>

            {/* 分段控制条 */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
              {options.map((opt) => {
                const isSelected = scaleLevel === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setScaleLevel(opt.key)}
                    className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-center ${
                      isSelected
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {/* 当前模式干练说明 */}
            <p className="mt-2 text-[11px] text-slate-400 px-1 truncate">
              {currentOption.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


