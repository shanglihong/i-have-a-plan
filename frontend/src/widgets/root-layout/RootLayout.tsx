import { Outlet, NavLink, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Network,
  Cpu,
  Layers,
  BookOpen,
  Target,
  Library,
} from "lucide-react"

import {
  ProjectTreeDrawer,
  ProjectDrawerMode,
  GlobalSearchBar,
  NotificationDropdown,
  FontScaleSelector,
  BreadcrumbNav,
} from "../../features"

interface NavItem {
  type: "link" | "tree-toggle"
  to?: string
  mode?: ProjectDrawerMode
  icon: any
  label: string
}

export default function RootLayout() {
  const location = useLocation()
  const [activeDrawerMode, setActiveDrawerMode] = useState<ProjectDrawerMode | null>(null)

  // 路由变化时自动收缩阅读/计划目录抽屉
  useEffect(() => {
    setActiveDrawerMode(null)
  }, [location.pathname])

  const navItems: NavItem[] = [
    { type: "link", to: "/dashboard", icon: LayoutDashboard, label: "大盘" },
    { type: "tree-toggle", mode: "reading", icon: BookOpen, label: "阅读" },
    { type: "tree-toggle", mode: "plan", icon: Target, label: "计划" },
    { type: "link", to: "/knowledge-bases", icon: Library, label: "知识库" },
    { type: "link", to: "/graph", icon: Network, label: "图谱" },
    { type: "link", to: "/skills/sandbox/skill-1", icon: Cpu, label: "技能" },
  ]

  const handleToggleDrawer = (mode: ProjectDrawerMode) => {
    setActiveDrawerMode((prev) => (prev === mode ? null : mode))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#090d16] text-slate-100">
      {/* Primary Activity Bar Navigation (w-16) */}
      <aside className="w-16 flex flex-col items-center py-4 gap-1.5 border-r border-white/10 bg-[#0c111d] shrink-0 z-40 select-none">
        {/* Logo */}
        <div
          onClick={() => setActiveDrawerMode(null)}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mb-3 cursor-pointer shadow-lg shadow-cyan-500/10 hover:opacity-90 transition-opacity"
          title="I Have A Plan"
        >
          <Layers size={20} className="text-slate-950 font-bold" />
        </div>

        {navItems.map((item) => {
          const Icon = item.icon
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
                key={item.label}
                onClick={() => handleToggleDrawer(item.mode!)}
                aria-label={item.label}
                title={titleText}
                className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all group relative cursor-pointer
                ${isTreeActive
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/10"
                  }`}
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
              key={item.to}
              to={item.to!}
              onClick={() => setActiveDrawerMode(null)}
              aria-label={item.label}
              className={({ isActive }) =>
                `w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all group relative cursor-pointer
              ${isActive
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/10"
                }`
              }
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
        })}

        <div className="flex-1" />
        {/* 系统偏好与字号缩放设置控制组件 */}
        <FontScaleSelector />
      </aside>

      {/* Project Tree Drawer Panel (Feature Component) */}
      <ProjectTreeDrawer
        isOpen={activeDrawerMode !== null}
        mode={activeDrawerMode || "reading"}
        onClose={() => setActiveDrawerMode(null)}
      />

      {/* Main content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Topbar */}
        <header className="h-13 flex items-center justify-between px-5 border-b border-white/10 bg-[#0c111d]/90 backdrop-blur-md shrink-0 relative z-30">
          {/* Breadcrumb Navigation Feature Component */}
          <BreadcrumbNav />

          <div className="flex items-center gap-3">
            {/* Global Search Bar Feature Component */}
            <GlobalSearchBar />

            {/* Notifications Dropdown Feature Component */}
            <NotificationDropdown />

            {/* Avatar */}
            <div
              aria-label="用户个人中心"
              className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white cursor-pointer ring-2 ring-white/10 hover:ring-cyan-400 transition-all shadow-md"
            >
              U
            </div>
          </div>
        </header>

        {/* Page Main Content Container */}
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

