import React from "react"
import {
  BadgeVariant,
  BADGE_VARIANT_STYLES,
  STATUS_VARIANT_MAP,
  STATUS_LABEL_MAP,
} from "../constants"

export type { BadgeVariant }

export interface StatusBadgeProps {
  status?: string
  label?: string
  variant?: BadgeVariant
  children?: React.ReactNode
  className?: string
}

/**
 * 纯样式状态标签组件 (复用 shared/constants 中的状态字典)
 */
export function StatusBadge({
  status,
  label,
  variant,
  children,
  className = "",
}: StatusBadgeProps) {
  const fallbackVariant = status ? STATUS_VARIANT_MAP[status] : undefined
  const fallbackLabel = status ? STATUS_LABEL_MAP[status] || status : ""
  const displayLabel = children || label || fallbackLabel || ""
  const activeVariant = variant || fallbackVariant || "slate"
  const cls = BADGE_VARIANT_STYLES[activeVariant] || BADGE_VARIANT_STYLES.slate

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono tracking-wide ${cls} ${className}`}
    >
      {displayLabel}
    </span>
  )
}
