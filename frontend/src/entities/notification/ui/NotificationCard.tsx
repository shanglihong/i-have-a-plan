import { NotificationItem } from "../model/types"

interface NotificationCardProps {
  notification: NotificationItem
  onClick?: () => void
}

export function NotificationCard({ notification, onClick }: NotificationCardProps) {
  const Icon = notification.icon

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
    >
      <Icon size={15} className={`${notification.iconColor} mt-0.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-200 leading-snug">{notification.msg}</p>
        <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
      </div>
    </div>
  )
}
