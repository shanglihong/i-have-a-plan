import { Outlet, NavLink, Link, useLocation } from "react-router-dom"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useClickOutside } from "../../shared/hooks/useClickOutside"
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  Network,
  Cpu,
  Search,
  Bell,
  X,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Sparkles,
  Settings,
  ChevronRight,
} from "lucide-react"

// ─── Breadcrumb Data Contract ─────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
}

// ─── Navigation Layout Widget ──────────────────────────────────────────────────

export default function RootLayout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState("")
  const [notifOpen, setNotifOpen] = useState(false)

  const location = useLocation()

  const notifRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 点击外部自动收起通知与搜索框
  useClickOutside(notifRef, () => setNotifOpen(false), notifOpen)
  useClickOutside(searchRef, () => setSearchOpen(false), searchOpen)

  // 全局快捷键 Cmd+K / Ctrl+K & Esc 支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      } else if (e.key === "Escape" && searchOpen) {
        if (searchVal) {
          setSearchVal("")
        } else {
          setSearchOpen(false)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [searchOpen, searchVal])

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "大盘" },
    { to: "/project/read/1", icon: BookOpen, label: "阅读" },
    { to: "/project/plan/2", icon: ListChecks, label: "计划" },
    { to: "/graph", icon: Network, label: "图谱" },
    { to: "/skills/sandbox/skill-1", icon: Cpu, label: "沙箱" },
  ]

  // 根据当前路径生成多级面包屑指示
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname
    if (path.startsWith("/dashboard")) {
      return [
        { label: "工作台", href: "/dashboard", icon: LayoutDashboard },
        { label: "知识大盘" },
      ]
    }
    if (path.startsWith("/project/read")) {
      const match = path.match(/\/project\/read\/(.+)/)
      const id = match ? match[1] : ""
      return [
        { label: "项目", icon: Layers },
        { label: "方案阅读", href: id ? `/project/read/${id}` : "/project/read/1", icon: BookOpen },
        ...(id ? [{ label: `方案详情 #${id}` }] : []),
      ]
    }
    if (path.startsWith("/project/plan")) {
      const match = path.match(/\/project\/plan\/(.+)/)
      const id = match ? match[1] : ""
      return [
        { label: "项目", icon: Layers },
        { label: "执行计划", href: id ? `/project/plan/${id}` : "/project/plan/2", icon: ListChecks },
        ...(id ? [{ label: `计划执行 #${id}` }] : []),
      ]
    }
    if (path.startsWith("/graph")) {
      return [
        { label: "知识库", icon: Layers },
        { label: "关联图谱", icon: Network },
      ]
    }
    if (path.startsWith("/skills/sandbox")) {
      const match = path.match(/\/skills\/sandbox\/(.+)/)
      const id = match ? match[1] : ""
      return [
        { label: "Skill 引擎", icon: Cpu },
        { label: "沙箱工作区", href: id ? `/skills/sandbox/${id}` : "/skills/sandbox/skill-1", icon: Cpu },
        ...(id ? [{ label: `实例 #${id}` }] : []),
      ]
    }
    return [
      { label: "控制台", icon: Layers },
      { label: "概览" },
    ]
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className="flex h-screen overflow-hidden bg-[#090d16] text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-16 flex flex-col items-center py-4 gap-1.5 border-r border-white/10 bg-[#0c111d] shrink-0 z-40 select-none">
        {/* Logo */}
        <div 
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mb-3 cursor-pointer shadow-lg shadow-cyan-500/10 hover:opacity-90 transition-opacity"
          title="I Have A Plan"
        >
          <Layers size={20} className="text-slate-950 font-bold" />
        </div>

        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
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
                <span className="text-[10px] font-medium leading-none tracking-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <div className="flex-1" />
        <button 
          aria-label="全局设置"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-all cursor-pointer"
        >
          <Settings size={18} />
        </button>
      </aside>

      {/* Main content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Topbar */}
        <header className="h-13 flex items-center justify-between px-5 border-b border-white/10 bg-[#0c111d]/90 backdrop-blur-md shrink-0 relative z-30">
          {/* Breadcrumb / Page Title */}
          <nav aria-label="面包屑导航" className="flex items-center text-xs select-none">
            <ol className="flex items-center gap-0.5">
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1
                const Icon = item.icon

                return (
                  <li key={index} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight size={12} className="text-slate-600 shrink-0 select-none mx-1" />
                    )}
                    {item.href && !isLast ? (
                      <Link
                        to={item.href}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-all font-medium group"
                      >
                        {Icon && <Icon size={14} className="shrink-0 text-slate-400 group-hover:text-cyan-300 transition-colors" />}
                        <span>{item.label}</span>
                      </Link>
                    ) : (
                      <div
                        className={`flex items-center gap-1.5 px-1.5 py-1 ${
                          isLast
                            ? "text-slate-100 font-semibold tracking-wide text-sm"
                            : "text-slate-400 font-medium"
                        }`}
                      >
                        {Icon && (
                          <Icon
                            size={isLast ? 15 : 14}
                            className={isLast ? "text-cyan-400 shrink-0" : "text-slate-400 shrink-0"}
                          />
                        )}
                        <span>{item.label}</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>

          <div className="flex items-center gap-3">
            {/* Search Bar Container */}
            <div className="relative" ref={searchRef}>
              <AnimatePresence mode="wait">
                {searchOpen ? (
                  <motion.div
                    key="search-input"
                    initial={{ width: 180, opacity: 0 }}
                    animate={{ width: 300, opacity: 1 }}
                    exit={{ width: 180, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#111827] border border-white/15 rounded-xl shadow-lg focus-within:border-slate-400/60 focus-within:ring-2 focus-within:ring-white/5 transition-all"
                  >
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      ref={searchInputRef}
                      autoFocus
                      value={searchVal}
                      onChange={(e) => setSearchVal(e.target.value)}
                      placeholder="搜索笔记、项目、图谱…"
                      style={{ outline: "none", boxShadow: "none" }}
                      className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-400 outline-none border-none focus:outline-none focus-visible:outline-none focus:ring-0 ring-0 shadow-none"
                    />
                    {searchVal ? (
                      <button
                        onClick={() => setSearchVal("")}
                        aria-label="清空搜索"
                        className="cursor-pointer text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-white/10 transition-colors"
                        title="清空"
                      >
                        <X size={13} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSearchOpen(false)}
                        aria-label="关闭搜索"
                        className="cursor-pointer text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-white/10 transition-colors"
                        title="关闭 (Esc)"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.button
                    key="search-button"
                    onClick={() => {
                      setSearchOpen(true)
                      setTimeout(() => searchInputRef.current?.focus(), 50)
                    }}
                    aria-label="打开全局搜索"
                    className="h-9 px-2.5 flex items-center gap-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer text-xs group"
                  >
                    <Search size={15} className="group-hover:text-slate-200 transition-colors" />
                    <span className="hidden md:inline-block text-slate-400 text-xs">搜索…</span>
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] bg-white/10 border border-white/10 text-slate-300 px-1.5 py-0.5 rounded font-mono font-medium shadow-sm">
                      ⌘K
                    </kbd>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="查看通知"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-all relative cursor-pointer"
              >
                <Bell size={16} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#0c111d]" />
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 w-80 bg-[#111827] border border-slate-700/80 rounded-xl shadow-2xl p-3 z-50"
                  >
                    <div className="flex items-center justify-between mb-2 px-1 pb-2 border-b border-slate-800">
                      <p className="text-xs text-slate-300 font-semibold">通知中心</p>
                      <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono">3 未读</span>
                    </div>
                    {[
                      {
                        icon: Sparkles,
                        msg: "「深度学习」技能编译完成，点击前往沙箱审批",
                        time: "刚刚",
                        iconColor: "text-cyan-400",
                      },
                      {
                        icon: AlertTriangle,
                        msg: "任务「基线模型训练」已逾期 8 天",
                        time: "1小时前",
                        iconColor: "text-amber-400",
                      },
                      {
                        icon: CheckCircle2,
                        msg: "《人类简史》图谱构建完成，新增 12 个节点",
                        time: "昨天",
                        iconColor: "text-emerald-400",
                      },
                    ].map((n, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <n.icon
                          size={15}
                          className={`${n.iconColor} mt-0.5 shrink-0`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-200 leading-snug">
                            {n.msg}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {n.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
