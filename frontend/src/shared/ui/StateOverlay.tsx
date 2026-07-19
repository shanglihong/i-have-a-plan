import React, { useState } from "react"

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
 * 纯技术通用状态遮罩层组件
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
            className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 ring-1 ring-cyan-500/50 text-cyan-300 rounded-lg text-sm font-medium transition-all cursor-pointer"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
