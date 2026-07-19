import React, { useState } from "react"
import { motion } from "framer-motion"

// ─── Shared UI Dumb Components (绝对无业务逻辑与硬编码文案) ───────────────────

export type BadgeVariant =
  | "cyan"
  | "amber"
  | "slate"
  | "violet"
  | "emerald"
  | "blue"
  | "red"

const badgeVariantStyles: Record<BadgeVariant, string> = {
  cyan: "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30",
  amber: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  slate: "bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30",
  violet: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30",
  emerald: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  blue: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30",
  red: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30 animate-breathe",
}

const statusToVariantMap: Record<string, BadgeVariant> = {
  ACTIVE: "cyan",
  SUSPENDED: "amber",
  ARCHIVED: "slate",
  PARSING: "violet",
  COMPLETED: "emerald",
  RUNNING: "blue",
  BLOCKED: "red",
  PENDING: "slate",
}

export interface StatusBadgeProps {
  status?: string
  label?: string
  variant?: BadgeVariant
  children?: React.ReactNode
  className?: string
}

/**
 * 纯样式状态标签组件（零硬编码业务文本）
 */
export function StatusBadge({
  status,
  label,
  variant,
  children,
  className = "",
}: StatusBadgeProps) {
  const fallbackVariant = status ? statusToVariantMap[status] : undefined
  const displayLabel = children || label || status || ""
  const activeVariant = variant || fallbackVariant || "slate"
  const cls = badgeVariantStyles[activeVariant] || badgeVariantStyles.slate

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono ${cls} ${className}`}
    >
      {displayLabel}
    </span>
  )
}

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

export interface StateOverlayProps {
  title?: string
  actionLabel?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  iconColor?: string
  onAction?: () => void
  children?: React.ReactNode
  className?: string
}

/**
 * 纯技术通用状态遮罩层组件（零硬编码业务文本）
 */
export function StateOverlay({
  title,
  actionLabel,
  icon: Icon,
  iconColor = "text-amber-400",
  onAction,
  children,
  className = "",
}: StateOverlayProps) {
  const [ripple, setRipple] = useState(false)

  const handleAction = () => {
    if (!onAction) return
    setRipple(true)
    setTimeout(() => {
      setRipple(false)
      onAction()
    }, 900)
  }

  return (
    <div
      className={`absolute inset-0 z-20 backdrop-blur-sm bg-[#0a0e1a]/70 flex items-center justify-center rounded-lg overflow-hidden ${className}`}
    >
      {ripple && (
        <div className="absolute w-32 h-32 rounded-full bg-cyan-400/30 ripple-effect" />
      )}
      <div className="text-center relative z-10 px-4">
        {Icon && (
          <div className="w-12 h-12 rounded-full bg-amber-500/20 ring-1 ring-amber-500/40 flex items-center justify-center mx-auto mb-3">
            <Icon size={20} className={iconColor} />
          </div>
        )}
        {title && <p className="text-sm text-slate-400 mb-4">{title}</p>}
        {children}
        {actionLabel && onAction && (
          <button
            onClick={handleAction}
            className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 ring-1 ring-cyan-500/50 text-cyan-300 rounded-lg text-sm font-medium transition-all"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
