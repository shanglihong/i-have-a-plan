import { LucideIcon } from "lucide-react"

export interface NotificationItem {
  id: string | number
  icon: LucideIcon
  msg: string
  time: string
  iconColor: string
  read?: boolean
}
