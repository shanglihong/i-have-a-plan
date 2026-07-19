import { Outlet, NavLink } from "react-router-dom"
import { useState, useRef } from "react"
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
} from "lucide-react"

// ─── Navigation Layout Widget ──────────────────────────────────────────────────

export default function RootLayout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState("")
  const [notifOpen, setNotifOpen] = useState(false)

  const notifRef = useRef<HTMLDivElement>(null)

  // 点击弹窗外部自动收起通知
  useClickOutside(notifRef, () => setNotifOpen(false), notifOpen)

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "大盘" },
    { to: "/project/read/1", icon: BookOpen, label: "阅读" },
    { to: "/project/plan/2", icon: ListChecks, label: "计划" },
    { to: "/graph", icon: Network, label: "图谱" },
    { to: "/skills/sandbox/skill-1", icon: Cpu, label: "沙箱" },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0e1a]">
      {/* Sidebar */}
      <aside className="w-14 flex flex-col items-center py-4 gap-1 border-r border-white/5 bg-[#0d1320] shrink-0">
        {/* Logo */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-4 cursor-pointer">
          <Layers size={16} className="text-white" />
        </div>

        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all group relative
            ${isActive
                ? "bg-cyan-500/15 text-cyan-400"
                : "text-slate-600 hover:text-slate-300 hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-400 rounded-r-full -ml-[1px]" />
                )}
                <Icon size={16} />
                <span className="text-[8px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <div className="flex-1" />
        <button className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all">
          <Settings size={16} />
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 flex items-center px-4 gap-3 border-b border-white/5 bg-[#0d1320]/80 backdrop-blur-sm shrink-0 relative z-30">
          <div className="flex-1" />

          {/* Search */}
          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                initial={{ width: 120, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 120, opacity: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 ring-1 ring-white/10 rounded-lg"
              >
                <Search size={13} className="text-slate-500 shrink-0" />
                <input
                  autoFocus
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="搜索笔记、项目、节点…"
                  className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
                />
                <button onClick={() => setSearchOpen(false)}>
                  <X size={12} className="text-slate-500" />
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
              >
                <Search size={15} />
              </button>
            )}
          </AnimatePresence>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="查看通知"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all relative"
            >
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 w-80 bg-[#111827]/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl p-3 z-50"
                >
                  <p className="text-xs text-slate-400 font-medium mb-2 px-1">通知</p>
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
                        size={14}
                        className={`${n.iconColor} mt-0.5 shrink-0`}
                      />
                      <div>
                        <p className="text-xs text-slate-300 leading-snug">
                          {n.msg}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
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
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer">
            U
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
