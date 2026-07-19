import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  GitBranch,
  Cpu,
  Globe,
  Search,
  Bell,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '大盘' },
  { to: '/graph', icon: Globe, label: '图谱' },
  { to: '/skills/sandbox/demo', icon: Cpu, label: '技能沙箱' },
]

export default function RootLayout() {
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const isWorkspace =
    location.pathname.startsWith('/project/read') ||
    location.pathname.startsWith('/project/plan')

  return (
    <div className="flex h-full bg-[var(--background)]">
      {/* Sidebar */}
      <aside
        className="flex flex-col gap-1 w-14 shrink-0 border-r border-[var(--border)] py-4 items-center"
        style={{ background: 'var(--muted)' }}
      >
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, var(--primary), var(--accent))',
            }}
          >
            <GitBranch size={16} className="text-[var(--background)]" />
          </div>
        </div>

        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-[var(--secondary)] text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]'
              }`
            }
          >
            <Icon size={18} />
            <span className="absolute left-full ml-2 px-2 py-1 rounded bg-[var(--card)] text-xs font-medium text-[var(--foreground)] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-[var(--border)]">
              {label}
            </span>
          </NavLink>
        ))}

        <div className="flex-1" />

        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          title="全局搜索"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all"
        >
          <Search size={16} />
        </button>

        {/* Notifications */}
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          title="通知"
          className="relative w-10 h-10 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--danger)]" />
        </button>

        {/* Avatar */}
        <div className="mt-2 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-xs font-semibold text-[var(--background)]">
          KX
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar for workspace pages */}
        {isWorkspace && (
          <div
            className="h-10 flex items-center px-4 gap-2 border-b border-[var(--border)] shrink-0"
            style={{ background: 'var(--muted)' }}
          >
            <NavLink
              to="/dashboard"
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              大盘
            </NavLink>
            <ChevronRight size={12} className="text-[var(--muted-foreground)]" />
            <span className="text-xs text-[var(--foreground)]">
              {location.pathname.startsWith('/project/read')
                ? '阅读工作台'
                : '计划执行台'}
            </span>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Global Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-24"
            style={{ backdropFilter: 'blur(12px)', background: 'rgba(8,9,12,0.7)' }}
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -8 }}
              className="w-full max-w-xl mx-4 rounded-xl border border-[var(--border)] overflow-hidden"
              style={{ background: 'var(--card)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center px-4 py-3 border-b border-[var(--border)] gap-3">
                <Search size={16} className="text-[var(--muted-foreground)]" />
                <input
                  autoFocus
                  placeholder="搜索项目、笔记、技能..."
                  className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
                />
                <kbd className="text-xs px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] font-mono">
                  ESC
                </kbd>
              </div>
              <div className="p-2">
                {['深度学习论文阅读 — 第3章', '计划：2026年Q3目标', '技能：批判性阅读框架'].map(
                  (item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--secondary)] cursor-pointer transition-colors"
                    >
                      <Search
                        size={12}
                        className="text-[var(--muted-foreground)] shrink-0"
                      />
                      <span className="text-sm text-[var(--card-foreground)]">{item}</span>
                    </div>
                  ),
                )}
              </div>
              <div className="px-4 py-2 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--muted-foreground)]">
                  3 个结果
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification panel */}
      <AnimatePresence>
        {notifOpen && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="fixed right-4 bottom-20 z-50 w-72 rounded-xl border border-[var(--border)] overflow-hidden shadow-2xl"
            style={{ background: 'var(--card)' }}
          >
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--foreground)]">通知</span>
              <span className="text-xs text-[var(--primary)]">全部标为已读</span>
            </div>
            {[
              { msg: '技能「批判性框架」编译完成，点击审批入库', time: '刚刚', dot: 'bg-[var(--success)]' },
              { msg: '任务「文献综述」已逾期 2 天', time: '10分钟前', dot: 'bg-[var(--danger)]' },
              { msg: '知识图谱已同步 12 个新节点', time: '1小时前', dot: 'bg-[var(--primary)]' },
            ].map((n, i) => (
              <div
                key={i}
                className="flex gap-3 px-4 py-3 hover:bg-[var(--secondary)] transition-colors cursor-pointer border-b border-[var(--border)] last:border-0"
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--card-foreground)] leading-snug">{n.msg}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{n.time}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
