import { Layers } from "lucide-react"
import { FontScaleSelector } from "../../../features"
import { type ProjectDrawerMode } from "./ProjectTreeDrawer"
import { cn } from "../../../shared/utils/cn"
import { NAV_ITEMS } from "../config/nav-config"
import { NavItemButton } from "./NavItemButton"

interface ActivityBarProps {
  activeDrawerMode: ProjectDrawerMode | null
  onToggleDrawer: (mode: ProjectDrawerMode) => void
  onClearDrawer: () => void
  className?: string
}

export function ActivityBar({
  activeDrawerMode,
  onToggleDrawer,
  onClearDrawer,
  className,
}: ActivityBarProps) {
  return (
    <aside
      className={cn(
        "w-16 flex flex-col items-center py-4 gap-1.5 border-r border-white/10 bg-[#0c111d] shrink-0 z-40 select-none",
        className
      )}
    >
      {/* Logo */}
      <div
        onClick={onClearDrawer}
        className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mb-3 cursor-pointer shadow-lg shadow-cyan-500/10 hover:opacity-90 transition-opacity"
        title="I Have A Plan"
      >
        <Layers size={20} className="text-slate-950 font-bold" />
      </div>

      {/* Navigation Items */}
      {NAV_ITEMS.map((item) => (
        <NavItemButton
          key={item.to || item.label}
          item={item}
          activeDrawerMode={activeDrawerMode}
          onToggleDrawer={onToggleDrawer}
          onClearDrawer={onClearDrawer}
        />
      ))}

      <div className="flex-1" />

      {/* 系统偏好与字号缩放设置控制组件 */}
      <FontScaleSelector />
    </aside>
  )
}
