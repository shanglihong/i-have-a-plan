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
  className = "",
}: DualMetricProgressBarProps) {
  const roundedProgress = Math.round(scrollProgress)

  return (
    <span className={`font-mono text-[11px] text-cyan-400 font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 shadow-xs ${className}`}>
      {roundedProgress}%
    </span>
  )
}
