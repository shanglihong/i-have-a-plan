import { motion } from "framer-motion"

export interface ProgressBarProps {
  value: number
  color?: string
  className?: string
}

/**
 * 纯样式进度条组件
 */
export function ProgressBar({
  value,
  color = "cyan",
  className = "",
}: ProgressBarProps) {
  const colors: Record<string, string> = {
    cyan: "bg-cyan-400",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    violet: "bg-violet-400",
  }
  return (
    <div className={`h-1 bg-white/5 rounded-full overflow-hidden ${className}`}>
      <motion.div
        className={`h-full ${colors[color] || colors.cyan} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  )
}
