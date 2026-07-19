import { useState, useMemo, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Folder,
  FolderOpen,
  ChevronRight,
  BookOpen,
  ListChecks,
  Search,
  X,
  Library,
  PanelLeftClose,
  FolderSearch,
  Loader2,
  Maximize2,
  Minimize2,
  FolderCog,
} from "lucide-react"
import { Project } from "../../shared/types"
import { useProjectsQuery } from "../../entities/project"

export interface KnowledgeBaseTreeDrawerProps {
  isOpen: boolean
  onClose: () => void
  projects?: Project[]
}

type FilterType = "ALL" | "READING" | "PLAN"

export function KnowledgeBaseTreeDrawer({
  isOpen,
  onClose,
  projects: propProjects,
}: KnowledgeBaseTreeDrawerProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // 抽屉宽屏放大模式状态 (240px 标准 ⇄ 360px 放大，默认宽屏)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("knowledge_base_tree_drawer_expanded")
      return stored !== null ? stored === "true" : true
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("knowledge_base_tree_drawer_expanded", isExpanded.toString())
    } catch {
      // 避免沙箱受限环境抛错
    }
  }, [isExpanded])

  // 发起 API 请求，由 MSW 在开发环境拦截注入，生产环境正常请求后端
  const { data: apiProjectsData, isLoading } = useProjectsQuery()

  // 优先使用传入的 projects，否则使用从 API 获取的项目列表
  const projectsList: Project[] = useMemo(() => {
    if (propProjects) return propProjects
    if (!apiProjectsData?.items) return []
    return apiProjectsData.items.map((item) => ({
      id: item.id,
      kb_id: item.kb_id,
      kb_name: item.kb_name,
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
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL")

  // 控制知识库文件夹展开收起的 State (Key 为 kbName 名称)
  const [expandedKbs, setExpandedKbs] = useState<Record<string, boolean>>({})

  // 按 kb_name 知识库名称分组作为文件夹，并根据搜索词与类型过滤
  const kbGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const groupsMap: Record<string, Project[]> = {}

    projectsList.forEach((p) => {
      // 类型过滤
      if (typeFilter === "READING" && p.type !== "READING") return
      if (typeFilter === "PLAN" && p.type !== "PLAN") return

      // 以 kb_name 作为文件夹，退化机制优先取 tags[0]，最后为 "默认知识库"
      const kbName = p.kb_name || (p.tags && p.tags.length > 0 ? `${p.tags[0]} 知识库` : "默认知识库")
      if (!groupsMap[kbName]) {
        groupsMap[kbName] = []
      }

      // 搜索匹配 (按项目标题、知识库名称或标签)
      if (
        !term ||
        p.title.toLowerCase().includes(term) ||
        kbName.toLowerCase().includes(term) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(term)))
      ) {
        groupsMap[kbName].push(p)
      }
    })

    return Object.entries(groupsMap)
      .filter(([_, list]) => list.length > 0)
      .map(([kbName, list]) => ({
        kbName,
        projects: list,
      }))
  }, [projectsList, searchTerm, typeFilter])

  const totalFilteredProjects = useMemo(() => {
    return kbGroups.reduce((acc, group) => acc + group.projects.length, 0)
  }, [kbGroups])

  const toggleKb = (kbName: string) => {
    setExpandedKbs((prev) => ({
      ...prev,
      [kbName]: !prev[kbName],
    }))
  }

  const isKbExpanded = (kbName: string, kbProjects: Project[]) => {
    if (searchTerm.trim().length > 0 || typeFilter !== "ALL") return true

    if (typeof expandedKbs[kbName] === "boolean") {
      return expandedKbs[kbName]
    }

    return kbProjects.some((p) => {
      const targetPath =
        p.type === "READING"
          ? `/project/read/${p.id}`
          : `/project/plan/${p.id}`
      return location.pathname === targetPath
    })
  }

  const handleResetFilters = () => {
    setSearchTerm("")
    setTypeFilter("ALL")
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isExpanded ? 360 : 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="h-full border-r border-white/10 bg-[#0a0e17] flex flex-col shrink-0 overflow-hidden select-none z-30 relative"
            role="region"
            aria-label="知识库目录抽屉"
          >
            {/* 内部弹性流体容器 */}
            <div className="w-full h-full flex flex-col shrink-0 overflow-hidden">
              {/* Drawer Header (改用 Library 专属文库图标) */}
              <div className="px-3.5 h-13 border-b border-white/10 bg-slate-900/40 backdrop-blur-sm flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                    <Library size={15} />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 tracking-wider uppercase truncate">
                    知识库目录
                  </span>
                  {isExpanded && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      宽屏模式
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* 一键切换抽屉宽度按钮 */}
                  <button
                    onClick={() => setIsExpanded((prev) => !prev)}
                    aria-label={isExpanded ? "还原抽屉宽度" : "放大抽屉宽度"}
                    aria-expanded={isExpanded}
                    title={isExpanded ? "还原为标准宽度 (240px)" : "放大抽屉宽度 (360px)"}
                    className={`p-1 rounded-lg transition-all cursor-pointer flex items-center justify-center border ${
                      isExpanded
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30"
                        : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/10 hover:border-white/10"
                    }`}
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
                    title="收起知识库目录 (Esc)"
                    aria-label="收起知识库目录"
                  >
                    <PanelLeftClose size={15} />
                  </button>
                </div>
              </div>

              {/* Search Box & Filter Pills */}
              <div className="px-3 py-2.5 shrink-0 border-b border-white/5 bg-slate-950/20 space-y-2">
                <div className="relative flex items-center">
                  <Search
                    size={13}
                    className="absolute left-2.5 text-slate-500 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索知识库、项目或标签..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
                      title="清空搜索"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Type Filter Pills */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTypeFilter("ALL")}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-all cursor-pointer text-center ${
                      typeFilter === "ALL"
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs font-semibold"
                        : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setTypeFilter("READING")}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      typeFilter === "READING"
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs font-semibold"
                        : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    <BookOpen size={11} />
                    <span>阅读</span>
                  </button>
                  <button
                    onClick={() => setTypeFilter("PLAN")}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      typeFilter === "PLAN"
                        ? "bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-xs font-semibold"
                        : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    <ListChecks size={11} />
                    <span>计划</span>
                  </button>
                </div>
              </div>

              {/* KnowledgeBase Tree List */}
              <div
                role="tree"
                aria-label="知识库目录树"
                className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]"
              >
                {isLoading && !propProjects ? (
                  <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                    <Loader2 size={18} className="animate-spin text-cyan-400" />
                    <span>数据获取中...</span>
                  </div>
                ) : kbGroups.length === 0 ? (
                  <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2">
                    <div className="p-3 rounded-full bg-white/5 text-slate-500 border border-white/5">
                      <FolderSearch size={22} />
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      未找到匹配的知识库目录
                    </span>
                    <button
                      onClick={handleResetFilters}
                      className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-medium mt-1 transition-colors"
                    >
                      重置搜索与筛选
                    </button>
                  </div>
                ) : (
                  kbGroups.map(({ kbName, projects: kbProjects }) => {
                    const expanded = isKbExpanded(kbName, kbProjects)
                    return (
                      <div key={kbName} className="space-y-0.5" role="none">
                        {/* KnowledgeBase Folder Node */}
                        <button
                          onClick={() => toggleKb(kbName)}
                          role="treeitem"
                          aria-expanded={expanded}
                          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-slate-300 hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer group text-left"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ChevronRight
                              size={14}
                              className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                                expanded ? "rotate-90 text-slate-200" : ""
                              }`}
                            />
                            {expanded ? (
                              <FolderOpen size={14} className="text-cyan-400 shrink-0" />
                            ) : (
                              <Folder size={14} className="text-slate-400 group-hover:text-slate-300 shrink-0" />
                            )}
                            <span className="text-xs font-semibold truncate text-slate-200 group-hover:text-cyan-300 transition-colors">
                              {kbName}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-medium text-slate-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-full shrink-0 group-hover:border-white/10 group-hover:text-slate-300 transition-all">
                            {kbProjects.length}
                          </span>
                        </button>

                        {/* Projects under this KnowledgeBase */}
                        <AnimatePresence initial={false}>
                          {expanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="pl-4 space-y-0.5 border-l border-white/10 ml-3.5 mt-0.5"
                              role="group"
                            >
                              {kbProjects.map((p) => {
                                const targetPath =
                                  p.type === "READING"
                                    ? `/project/read/${p.id}`
                                    : `/project/plan/${p.id}`
                                const isActive = location.pathname === targetPath

                                return (
                                  <button
                                    key={p.id}
                                    onClick={() => navigate(targetPath)}
                                    role="treeitem"
                                    aria-selected={isActive}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-all cursor-pointer text-left group active:scale-[0.99] ${
                                      isActive
                                        ? p.type === "READING"
                                          ? "bg-cyan-500/15 text-cyan-200 font-semibold border border-cyan-500/30 shadow-xs shadow-cyan-950/40"
                                          : "bg-violet-500/15 text-violet-200 font-semibold border border-violet-500/30 shadow-xs shadow-violet-950/40"
                                        : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {p.type === "READING" ? (
                                        <BookOpen
                                          size={13}
                                          className={
                                            isActive
                                              ? "text-cyan-300 shrink-0"
                                              : "text-cyan-400/70 shrink-0 group-hover:text-cyan-300 transition-colors"
                                          }
                                        />
                                      ) : (
                                        <ListChecks
                                          size={13}
                                          className={
                                            isActive
                                              ? "text-violet-300 shrink-0"
                                              : "text-violet-400/70 shrink-0 group-hover:text-violet-300 transition-colors"
                                          }
                                        />
                                      )}
                                      <span className="truncate">{p.title}</span>
                                    </div>
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        p.status === "COMPLETED"
                                          ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                                          : p.status === "SUSPENDED"
                                            ? "bg-amber-400"
                                            : p.status === "ARCHIVED"
                                              ? "bg-slate-500"
                                              : "bg-cyan-400 animate-pulse"
                                      }`}
                                      title={`状态: ${p.status}`}
                                    />
                                  </button>
                                )
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer Summary & Action Bar */}
              <div className="px-3 py-2 border-t border-white/10 bg-slate-950/40 flex items-center justify-between shrink-0 text-xs text-slate-400 select-none">
                <span className="font-mono">
                  {kbGroups.length} 知识库 / {totalFilteredProjects} 项目
                </span>
                <button
                  onClick={() => navigate("/knowledge-bases")}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all text-slate-300 cursor-pointer font-medium"
                  title="管理知识库文件夹"
                >
                  <FolderCog size={12} />
                  <span>管理</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
