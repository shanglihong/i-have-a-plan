import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, BookOpen } from "lucide-react"

export interface ChapterMarker {
  id: string
  label: string
  progressPercent: number
  estimatedMinutes: number
}

interface DualMetricProgressBarProps {
  scrollProgress: number
  understandingProgress?: number
  chapters?: ChapterMarker[]
  onSelectChapter?: (chapterId: string) => void
  className?: string
}

export function DualMetricProgressBar({
  scrollProgress,
  understandingProgress = 82,
  chapters = [],
  onSelectChapter,
  className = "",
}: DualMetricProgressBarProps) {
  const [hoveredChapter, setHoveredChapter] = useState<ChapterMarker | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0 })

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Scroll Progress Bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span className="flex items-center gap-1.5 text-slate-300">
            <BookOpen size={13} className="text-cyan-400" />
            正文阅读进度
          </span>
          <span className="font-mono text-cyan-400 font-semibold">
            {Math.round(scrollProgress)}%
          </span>
        </div>
        <div className="relative h-2 w-full bg-slate-900 rounded-full overflow-visible border border-slate-800/80">
          {/* Progress fill */}
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-150 ease-out shadow-sm shadow-cyan-950"
            style={{ width: `${Math.min(100, Math.max(0, scrollProgress))}%` }}
          />

          {/* Chapter Tick Markers */}
          {chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onSelectChapter?.(ch.id)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setTooltipPos({ x: rect.left })
                setHoveredChapter(ch)
              }}
              onMouseLeave={() => setHoveredChapter(null)}
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-slate-700 hover:bg-cyan-300 rounded-sm transition-all z-10 cursor-pointer hover:scale-125"
              style={{ left: `${ch.progressPercent}%` }}
              aria-label={`跳转至 ${ch.label}`}
            />
          ))}
        </div>
      </div>

      {/* Comprehension / Chunk Parsed Progress */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1 font-medium">
          <span className="text-slate-400">精读卡片理解度</span>
          <span className="font-mono text-violet-400 font-semibold">
            {understandingProgress}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, understandingProgress))}%` }}
          />
        </div>
      </div>

      {/* Chapter Hover Tooltip */}
      <AnimatePresence>
        {hoveredChapter && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="fixed z-50 bg-[#121A29] border border-slate-700/90 rounded-lg px-2.5 py-1.5 shadow-xl backdrop-blur-md pointer-events-none text-xs text-slate-200 flex items-center gap-2"
            style={{
              left: Math.max(10, tooltipPos.x - 60),
              top: window.scrollY + 40,
            }}
          >
            <span className="font-semibold text-cyan-300 truncate max-w-[140px]">
              {hoveredChapter.label}
            </span>
            <span className="text-slate-400 font-mono flex items-center gap-1">
              <Clock size={11} className="text-slate-400" />
              ~{hoveredChapter.estimatedMinutes} min
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
