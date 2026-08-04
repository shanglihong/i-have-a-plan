import {
  LayoutDashboard,
  Network,
  Cpu,
  BookOpen,
  Target,
  Library,
  type LucideIcon,
} from "lucide-react"
import { type ProjectDrawerMode } from "../components/ProjectTreeDrawer"

export interface NavItem {
  type: "link" | "tree-toggle"
  to?: string
  mode?: ProjectDrawerMode
  icon: LucideIcon
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { type: "link", to: "/dashboard", icon: LayoutDashboard, label: "大盘" },
  { type: "tree-toggle", mode: "reading", icon: BookOpen, label: "阅读" },
  { type: "tree-toggle", mode: "plan", icon: Target, label: "计划" },
  { type: "link", to: "/knowledge-bases", icon: Library, label: "知识库" },
  { type: "link", to: "/graph", icon: Network, label: "图谱" },
  { type: "link", to: "/skills/sandbox/skill-1", icon: Cpu, label: "技能" },
]
