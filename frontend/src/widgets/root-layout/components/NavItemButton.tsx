import { NavLink, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { cn } from "../../../shared/utils/cn"
import { type ProjectDrawerMode } from "./ProjectTreeDrawer"
import { type NavItem } from "../config/nav-config"

interface NavItemButtonProps {
  item: NavItem
  activeDrawerMode: ProjectDrawerMode | null
  onToggleDrawer: (mode: ProjectDrawerMode) => void
  onClearDrawer: () => void
}

export function NavItemButton({
  item,
  activeDrawerMode,
  onToggleDrawer,
  onClearDrawer,
}: NavItemButtonProps) {
  const location = useLocation()
  const Icon = item.icon

  const getItemClassNames = (isActive: boolean) =>
    cn(
      "w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all group relative cursor-pointer",
      isActive
        ? "bg-cyan-500/20 text-cyan-300 font-semibold"
        : "text-slate-400 hover:text-slate-100 hover:bg-white/10"
    )

  if (item.type === "tree-toggle" && item.mode) {
    const isTreeActive =
      activeDrawerMode === item.mode ||
      (item.mode === "reading" && location.pathname.startsWith("/project/read/")) ||
      (item.mode === "plan" && location.pathname.startsWith("/project/plan/"))

    const titleText =
      activeDrawerMode === item.mode
        ? `收起${item.label}目录`
        : `展开${item.label}目录`

    return (
      <button
        onClick={() => onToggleDrawer(item.mode!)}
        aria-label={item.label}
        title={titleText}
        className={getItemClassNames(isTreeActive)}
      >
        {isTreeActive && (
          <motion.div
            layoutId="activeNavIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full -ml-[1px]"
          />
        )}
        <Icon size={18} className="shrink-0" />
        <span className="text-xs font-medium leading-none tracking-tight">{item.label}</span>
      </button>
    )
  }

  return (
    <NavLink
      to={item.to!}
      onClick={onClearDrawer}
      aria-label={item.label}
      className={({ isActive }) => getItemClassNames(isActive)}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="activeNavIndicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full -ml-[1px]"
            />
          )}
          <Icon size={18} className="shrink-0" />
          <span className="text-xs font-medium leading-none tracking-tight">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}
