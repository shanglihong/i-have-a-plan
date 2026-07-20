import { useLocation, Link } from "react-router-dom"
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Network,
  Cpu,
  Library,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { useProjectsQuery } from "../../entities/project"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
}

export function BreadcrumbNav() {
  const location = useLocation()

  // 发起项目列表 API 查询（开发期由 MSW 拦截注入响应，生产环境为直连 API）
  const { data: projectsData } = useProjectsQuery()
  const projects = projectsData?.items || []

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname

    if (path.startsWith("/dashboard")) {
      return [
        { label: "工作台", icon: LayoutDashboard },
      ]
    }

    if (path.startsWith("/knowledge-bases")) {
      return [
        { label: "工作台", href: "/dashboard", icon: LayoutDashboard },
        { label: "知识库", icon: Library },
      ]
    }

    if (path.startsWith("/notes")) {
      return [
        { label: "工作台", href: "/dashboard", icon: LayoutDashboard },
        { label: "知识输出中心", icon: Sparkles },
      ]
    }

    if (path.startsWith("/project/read")) {
      const match = path.match(/\/project\/read\/([^/]+)/)
      const id = match ? match[1] : ""
      const project = projects.find((p) => p.id === id)

      const items: BreadcrumbItem[] = [
        { label: "工作台", href: "/dashboard", icon: LayoutDashboard },
        { label: "阅读", icon: BookOpen },
      ]
      items.push({
        label: project?.title || (id ? `精读项目 #${id}` : "未命名项目"),
        icon: BookOpen,
      })
      return items
    }

    if (path.startsWith("/project/plan")) {
      const match = path.match(/\/project\/plan\/([^/]+)/)
      const id = match ? match[1] : ""
      const project = projects.find((p) => p.id === id)

      const items: BreadcrumbItem[] = [
        { label: "工作台", href: "/dashboard", icon: LayoutDashboard },
        { label: "计划", icon: Target },
      ]
      items.push({
        label: project?.title || (id ? `执行计划 #${id}` : "未命名计划"),
        icon: Target,
      })
      return items
    }

    if (path.startsWith("/graph")) {
      return [
        { label: "工作台", href: "/dashboard", icon: LayoutDashboard },
        { label: "关联图谱", icon: Network },
      ]
    }

    if (path.startsWith("/skills/sandbox")) {
      const match = path.match(/\/skills\/sandbox\/([^/]+)/)
      const id = match ? match[1] : ""
      const skillNameMap: Record<string, string> = {
        "skill-1": "知识抽取与计划生成 Skill",
        "skill-2": "智能摘要 Skill",
      }
      const name = skillNameMap[id] || (id ? `实例 #${id}` : "Skill 沙箱")

      return [
        { label: "工作台", href: "/dashboard", icon: LayoutDashboard },
        { label: "Skill 引擎", icon: Cpu },
        { label: "沙箱工作区", href: id ? `/skills/sandbox/${id}` : "/skills/sandbox/skill-1", icon: Cpu },
        { label: name },
      ]
    }

    return [
      { label: "工作台", href: "/dashboard", icon: LayoutDashboard },
      { label: "概览" },
    ]
  }

  const breadcrumbs = getBreadcrumbs()

  return (
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
                  className={`flex items-center gap-1.5 px-1.5 py-1 ${isLast
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
  )
}
