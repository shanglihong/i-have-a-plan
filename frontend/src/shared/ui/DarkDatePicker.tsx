import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

export interface DarkDatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (val: string) => void
  color?: "cyan" | "violet"
  className?: string
}

/**
 * 暗黑拟态选日组件 (Dark Mode Glass DatePicker)
 */
export function DarkDatePicker({
  value,
  onChange,
  color = "cyan",
  className = "",
}: DarkDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const parsedDate = value ? new Date(value) : new Date()
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate

  const [viewYear, setViewYear] = useState(validDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(validDate.getMonth())

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const formatDateISO = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const handleQuickAdd = (daysToAdd: number) => {
    const target = new Date()
    target.setDate(target.getDate() + daysToAdd)
    const formatted = formatDateISO(target)
    onChange(formatted)
    setViewYear(target.getFullYear())
    setViewMonth(target.getMonth())
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()
  const todayStr = formatDateISO(new Date())

  const gridCells = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    gridCells.push({ day: daysInPrevMonth - i, monthType: "prev", dateStr: "" })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push({
      day: d,
      monthType: "current",
      dateStr: formatDateISO(new Date(viewYear, viewMonth, d)),
    })
  }
  const remaining = (7 - (gridCells.length % 7)) % 7
  for (let n = 1; n <= remaining; n++) {
    gridCells.push({ day: n, monthType: "next", dateStr: "" })
  }

  const themeRing =
    color === "cyan"
      ? "focus:ring-cyan-500/40 focus:border-cyan-500/60"
      : "focus:ring-violet-500/40 focus:border-violet-500/60"
  const themeText = color === "cyan" ? "text-cyan-400" : "text-violet-400"

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => handleQuickAdd(7)}
          className="px-2 py-0.5 text-[11px] rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/8 transition-all cursor-pointer"
        >
          +1周后
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd(30)}
          className="px-2 py-0.5 text-[11px] rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/8 transition-all cursor-pointer"
        >
          +1个月后
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd(90)}
          className="px-2 py-0.5 text-[11px] rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/8 transition-all cursor-pointer"
        >
          +3个月后
        </button>
      </div>

      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 flex items-center justify-between cursor-pointer transition-all hover:border-slate-600 ${
          isOpen ? themeRing : ""
        }`}
      >
        <div className="flex items-center gap-2.5">
          <CalendarIcon size={16} className={themeText} />
          <span className="font-mono text-slate-200">{value || "选择日期..."}</span>
        </div>
        <span className="text-xs text-slate-500">更改</span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 z-50 w-72 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/12 p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-100">
                {viewYear}年 {viewMonth + 1}月
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500 font-medium mb-2">
              <span>日</span>
              <span>一</span>
              <span>二</span>
              <span>三</span>
              <span>四</span>
              <span>五</span>
              <span>六</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {gridCells.map((cell, idx) => {
                if (cell.monthType !== "current") {
                  return (
                    <div key={idx} className="py-1 text-slate-700 pointer-events-none">
                      {cell.day}
                    </div>
                  )
                }

                const isSelected = cell.dateStr === value
                const isToday = cell.dateStr === todayStr

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onChange(cell.dateStr)
                      setIsOpen(false)
                    }}
                    className={`py-1 rounded-lg text-xs font-medium transition-all relative cursor-pointer ${
                      isSelected
                        ? color === "cyan"
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30"
                          : "bg-violet-500 text-slate-950 font-bold shadow-md shadow-violet-500/30"
                        : isToday
                        ? "bg-white/10 text-cyan-300 font-semibold ring-1 ring-cyan-500/40"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
