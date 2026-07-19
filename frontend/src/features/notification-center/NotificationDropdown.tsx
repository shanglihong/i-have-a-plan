import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useClickOutside } from "../../shared/hooks/useClickOutside"
import { NotificationCard, NotificationItem } from "../../entities/notification"

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    icon: Sparkles,
    msg: "「深度学习」技能编译完成，点击前往沙箱审批",
    time: "刚刚",
    iconColor: "text-cyan-400",
  },
  {
    id: 2,
    icon: AlertTriangle,
    msg: "任务「基线模型训练」已逾期 8 天",
    time: "1小时前",
    iconColor: "text-amber-400",
  },
  {
    id: 3,
    icon: CheckCircle2,
    msg: "《人类简史》图谱构建完成，新增 12 个节点",
    time: "昨天",
    iconColor: "text-emerald-400",
  },
]

export function NotificationDropdown() {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useClickOutside(notifRef, () => setNotifOpen(false), notifOpen)

  return (
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
              <span className="text-xs text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono">
                {DEFAULT_NOTIFICATIONS.length} 未读
              </span>
            </div>
            {DEFAULT_NOTIFICATIONS.map((n) => (
              <NotificationCard key={n.id} notification={n} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
