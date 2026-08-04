import { useState, useMemo, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen,
  Target,
  Search,
  X,
  PanelLeftClose,
  FolderSearch,
  Loader2,
  Maximize2,
  Minimize2,
  ChevronRight,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Archive,
  type LucideIcon,
} from "lucide-react"
import { type Project } from "../../../shared/types"
import { useProjectsQuery } from "../../../entities/project"
import { cn } from "../../../shared/utils/cn"

export type ProjectDrawerMode = "reading" | "plan"

export interface ProjectTreeDrawerProps {
  isOpen: boolean
  onClose: () => void
  projects?: Project[]
  mode?: ProjectDrawerMode
}

interface StatusGroupConfig {
  key: string
  label: string
  color: string
  badgeBg: string
  icon: LucideIcon
}

const STATUS_CONFIGS: StatusGroupConfig[] = [
  {
    key: "IN_PROGRESS",
    label: "进行中",
    color: "text-cyan-400",
    badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    icon: PlayCircle,
  },
  {
    key: "SUSPENDED",
    label: "已暂停",
    color: "text-amber-400",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: PauseCircle,
  },
  {
    key: "COMPLETED",
    label: "已完成",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: CheckCircle2,
  },
  {
    key: "ARCHIVED",
    label: "已归档",
    color: "text-slate-400",
    badgeBg: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    icon: Archive,
  },
]

interface ModeConfig {
  title: string
  icon: LucideIcon
  searchPlaceholder: string
  emptyText: string
  drawerAriaLabel: string
  treeAriaLabel: string
  getItemCountText: (count: number, groupCount: number) => string
  filterProject: (p: Project) => boolean
}

const MODE_CONFIGS: Record<ProjectDrawerMode, ModeConfig> = {
  reading: {
    title: "阅读目录",
    icon: BookOpen,
    searchPlaceholder: "搜索阅读项目...",
    emptyText: "未找到匹配的阅读项目",
    drawerAriaLabel: "阅读目录抽屉",
    treeAriaLabel: "阅读项目列表",
    getItemCountText: (count: number, groupCount: number) =>
      `共 ${count} 个阅读项目 (${groupCount} 状态分类)`,
    filterProject: (p: Project) => p.type === "READING",
  },
  plan: {
    title: "计划目录",
    icon: Target,
    searchPlaceholder: "搜索计划项目...",
    emptyText: "未找到匹配的计划项目",
    drawerAriaLabel: "计划目录抽屉",
    treeAriaLabel: "计划项目列表",
    getItemCountText: (count: number, groupCount: number) =>
      `共 ${count} 个计划项目 (${groupCount} 状态分类)`,
    filterProject: (p: Project) => p.type === "PLAN",
  },
}

// ─── 抽屉顶栏子组件 ─────────────────────────────────────────────────────────────

interface DrawerHeaderProps {
  title: string
  icon: LucideIcon
  isExpanded: boolean
  onToggleExpand: () => void
  onClose: () => void
}

function DrawerHeader({
  title,
  icon: Icon,
  isExpanded,
  onToggleExpand,
  onClose,
}: DrawerHeaderProps) {
  return (
    <div className="px-3.5 h-13 border-b border-white/10 bg-slate-900/40 backdrop-blur-sm flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
          <Icon size={15} />
        </div>
        <span className="text-xs sm:text-sm font-semibold text-slate-200 tracking-wide uppercase truncate">
          {title}
        </span>
        {isExpanded && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            宽屏模式
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleExpand}
          aria-label={isExpanded ? "还原抽屉宽度" : "放大抽屉宽度"}
          aria-expanded={isExpanded}
          title={isExpanded ? "还原为标准宽度 (240px)" : "放大抽屉宽度 (360px)"}
          className={cn(
            "p-1 rounded-lg transition-all cursor-pointer flex items-center justify-center border",
            isExpanded
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30"
              : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/10 hover:border-white/10"
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isExpanded ? "minimize" : "maximize"}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </motion.div>
          </AnimatePresence>
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          title={`收起${title} (Esc)`}
          aria-label={`收起${title}`}
        >
          <PanelLeftClose size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── 搜索栏子组件 ─────────────────────────────────────────────────────────────

interface DrawerSearchBarProps {
  searchTerm: string
  searchPlaceholder: string
  onSearchChange: (value: string) => void
  onClear: () => void
}

function DrawerSearchBar({
  searchTerm,
  searchPlaceholder,
  onSearchChange,
  onClear,
}: DrawerSearchBarProps) {
  return (
    <div className="px-3 py-2.5 shrink-0 border-b border-white/5 bg-slate-950/20">
      <div className="relative flex items-center">
        <Search
          size={14}
          className="absolute left-2.5 text-slate-500 pointer-events-none"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
        />
        {searchTerm && (
          <button
            onClick={onClear}
            className="absolute right-2 text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
            title="清空搜索"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── 项目条目按钮子组件 ─────────────────────────────────────────────────────────────

interface ProjectItemButtonProps {
  project: Project
  isActive: boolean
  onClick: () => void
}

function ProjectItemButton({
  project,
  isActive,
  onClick,
}: ProjectItemButtonProps) {
  const ItemIcon = project.type === "PLAN" ? Target : BookOpen

  return (
    <button
      onClick={onClick}
      role="treeitem"
      aria-selected={isActive}
      className={cn(
        "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs sm:text-[13px] transition-all cursor-pointer text-left group active:scale-[0.99]",
        isActive
          ? "bg-cyan-500/15 text-cyan-200 font-semibold border border-cyan-500/30 shadow-xs shadow-cyan-950/40"
          : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <ItemIcon
          size={14}
          className={cn(
            "shrink-0 transition-colors",
            isActive
              ? "text-cyan-300"
              : "text-cyan-400/70 group-hover:text-cyan-300"
          )}
        />
        <span className="truncate">{project.title}</span>
      </div>
      {project.progress !== undefined && project.progress !== null && (
        <span className="text-[10px] font-mono text-slate-400 shrink-0">
          {project.progress}%
        </span>
      )}
    </button>
  )
}

// ─── 状态分组节点子组件 ─────────────────────────────────────────────────────────────

interface StatusGroupNodeProps {
  group: StatusGroupConfig & { projects: Project[] }
  isExpanded: boolean
  activePath: string
  onToggle: () => void
  onSelectProject: (path: string) => void
}

function StatusGroupNode({
  group,
  isExpanded,
  activePath,
  onToggle,
  onSelectProject,
}: StatusGroupNodeProps) {
  const StatusIcon = group.icon

  return (
    <div className="space-y-0.5" role="none">
      <button
        onClick={onToggle}
        role="treeitem"
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-slate-300 hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer group text-left"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ChevronRight
            size={14}
            className={cn(
              "text-slate-400 shrink-0 transition-transform duration-200",
              isExpanded && "rotate-90 text-slate-200"
            )}
          />
          <StatusIcon size={14} className={cn(group.color, "shrink-0")} />
          <span className="text-xs sm:text-sm font-semibold truncate text-slate-200 group-hover:text-cyan-300 transition-colors">
            {group.label}
          </span>
        </div>
        <span
          className={cn(
            "text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full border shrink-0",
            group.badgeBg
          )}
        >
          {group.projects.length}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pl-3.5 space-y-0.5 border-l border-white/10 ml-3.5 mt-0.5"
            role="group"
          >
            {group.projects.map((p) => {
              const targetPath =
                p.type === "PLAN" ? `/project/plan/${p.id}` : `/project/read/${p.id}`
              const isActive = activePath === targetPath

              return (
                <ProjectItemButton
                  key={p.id}
                  project={p}
                  isActive={isActive}
                  onClick={() => onSelectProject(targetPath)}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ProjectTreeDrawer 主入口组件 ───────────────────────────────────────────────────

export function ProjectTreeDrawer({
  isOpen,
  onClose,
  projects: propProjects,
  mode = "reading",
}: ProjectTreeDrawerProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentModeConfig = MODE_CONFIGS[mode] || MODE_CONFIGS.reading

  // 抽屉宽屏放大模式状态 (240px 标准 ⇄ 360px 放大，默认宽屏)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("project_tree_drawer_expanded")
      return stored !== null ? stored === "true" : true
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("project_tree_drawer_expanded", isExpanded.toString())
    } catch {
      // 避免沙箱受限环境抛错
    }
  }, [isExpanded])

  // 发起 API 请求
  const { data: apiProjectsData, isLoading } = useProjectsQuery()

  // 优先使用传入的 projects，否则使用从 API 获取的项目列表
  const projectsList: Project[] = useMemo(() => {
    if (propProjects) return propProjects
    if (!apiProjectsData?.items) return []
    return apiProjectsData.items.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      progress: item.progress,
      deadline: item.deadline,
      tags: item.tags || [],
      createdAt: item.createdAt,
      notes: item.notes,
      tasks: item.tasks,
    }))
  }, [propProjects, apiProjectsData])

  const [searchTerm, setSearchTerm] = useState("")
  const [expandedStatuses, setExpandedStatuses] = useState<Record<string, boolean>>({})

  // 按状态分类的项目分组
  const statusGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const map: Record<string, Project[]> = {
      IN_PROGRESS: [],
      SUSPENDED: [],
      COMPLETED: [],
      ARCHIVED: [],
    }

    projectsList.forEach((p) => {
      if (!currentModeConfig.filterProject(p)) return
      if (
        term &&
        !p.title.toLowerCase().includes(term) &&
        (!p.tags || !p.tags.some((t) => t.toLowerCase().includes(term)))
      ) {
        return
      }

      const statusStr = p.status as string
      const statusKey =
        statusStr === "ACTIVE" || statusStr === "IN_PROGRESS" || statusStr === "INIT" || statusStr === "PARSING"
          ? "IN_PROGRESS"
          : statusStr === "COMPLETED"
            ? "COMPLETED"
            : statusStr === "SUSPENDED"
              ? "SUSPENDED"
              : statusStr === "ARCHIVED"
                ? "ARCHIVED"
                : "IN_PROGRESS"

      if (!map[statusKey]) {
        map[statusKey] = []
      }
      map[statusKey].push(p)
    })

    return STATUS_CONFIGS.map((cfg) => ({
      ...cfg,
      projects: map[cfg.key] || [],
    })).filter((group) => group.projects.length > 0)
  }, [projectsList, searchTerm, currentModeConfig])

  const totalProjectsCount = useMemo(() => {
    return statusGroups.reduce((acc, g) => acc + g.projects.length, 0)
  }, [statusGroups])

  const isStatusExpanded = (statusKey: string, groupProjects: Project[]) => {
    if (searchTerm.trim().length > 0) return true
    if (typeof expandedStatuses[statusKey] === "boolean") {
      return expandedStatuses[statusKey]
    }
    const hasActiveProject = groupProjects.some(
      (p) => location.pathname === `/project/read/${p.id}` || location.pathname === `/project/plan/${p.id}`
    )
    if (hasActiveProject) return true
    return statusKey === "IN_PROGRESS"
  }

  const toggleStatusGroup = (statusKey: string) => {
    setExpandedStatuses((prev) => ({
      ...prev,
      [statusKey]: !isStatusExpanded(statusKey, statusGroups.find((g) => g.key === statusKey)?.projects || []),
    }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: isExpanded ? 360 : 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="h-full border-r border-white/10 bg-[#0a0e17] flex flex-col shrink-0 overflow-hidden select-none z-30 relative"
          role="region"
          aria-label={currentModeConfig.drawerAriaLabel}
        >
          <div className="w-full h-full flex flex-col shrink-0 overflow-hidden">
            {/* Header 子组件 */}
            <DrawerHeader
              title={currentModeConfig.title}
              icon={currentModeConfig.icon}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded((prev) => !prev)}
              onClose={onClose}
            />

            {/* SearchBar 子组件 */}
            <DrawerSearchBar
              searchTerm={searchTerm}
              searchPlaceholder={currentModeConfig.searchPlaceholder}
              onSearchChange={setSearchTerm}
              onClear={() => setSearchTerm("")}
            />

            {/* Projects Stream */}
            <div
              role="tree"
              aria-label={currentModeConfig.treeAriaLabel}
              className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1.5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]"
            >
              {isLoading && !propProjects ? (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 size={18} className="animate-spin text-cyan-400" />
                  <span>数据加载中...</span>
                </div>
              ) : statusGroups.length === 0 ? (
                <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2">
                  <div className="p-3 rounded-full bg-white/5 text-slate-500 border border-white/5">
                    <FolderSearch size={22} />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-400 font-medium">
                    {currentModeConfig.emptyText}
                  </span>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-medium mt-1 transition-colors"
                    >
                      清空搜索词
                    </button>
                  )}
                </div>
              ) : (
                statusGroups.map((group) => (
                  <StatusGroupNode
                    key={group.key}
                    group={group}
                    isExpanded={isStatusExpanded(group.key, group.projects)}
                    activePath={location.pathname}
                    onToggle={() => toggleStatusGroup(group.key)}
                    onSelectProject={(path) => navigate(path)}
                  />
                ))
              )}
            </div>

            {/* Footer Summary */}
            <div className="px-3.5 py-2.5 border-t border-white/10 bg-slate-950/40 flex items-center justify-between shrink-0 text-xs text-slate-400 select-none">
              <span className="font-mono text-xs text-slate-400 font-medium">
                {currentModeConfig.getItemCountText(totalProjectsCount, statusGroups.length)}
              </span>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
