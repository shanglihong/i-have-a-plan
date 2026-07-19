import { useState, useMemo } from "react"
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
  Plus,
  Layers,
  PanelLeftClose,
  FolderTree,
} from "lucide-react"
import { Project } from "../../shared/types"

interface CategoryTreeDrawerProps {
  isOpen: boolean
  onClose: () => void
  projects: Project[]
}

type FilterType = "ALL" | "READING" | "PLAN"

export function CategoryTreeDrawer({
  isOpen,
  onClose,
  projects,
}: CategoryTreeDrawerProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL")

  // 控制分类展开收起的 State (Key 为 category 名称)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  // 按 category 分组并根据搜索词与类型过滤
  const categoryGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const groupsMap: Record<string, Project[]> = {}

    projects.forEach((p) => {
      // 类型过滤
      if (typeFilter === "READING" && p.type !== "READING") return
      if (typeFilter === "PLAN" && p.type !== "PLAN") return

      const cat = p.category || "未分类"
      if (!groupsMap[cat]) {
        groupsMap[cat] = []
      }

      // 搜索匹配 (按项目标题或分类名)
      if (
        !term ||
        p.title.toLowerCase().includes(term) ||
        cat.toLowerCase().includes(term) ||
        p.tags.some((t) => t.toLowerCase().includes(term))
      ) {
        groupsMap[cat].push(p)
      }
    })

    return Object.entries(groupsMap)
      .filter(([_, list]) => list.length > 0)
      .map(([cat, list]) => ({
        category: cat,
        projects: list,
      }))
  }, [projects, searchTerm, typeFilter])

  const totalFilteredProjects = useMemo(() => {
    return categoryGroups.reduce((acc, group) => acc + group.projects.length, 0)
  }, [categoryGroups])

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }))
  }

  // 判断是否展开 (在搜索/类型过滤时自动展开；默认若包含当前高亮选中的项目则自动展开，否则跟随用户手动设置)
  const isCategoryExpanded = (cat: string, catProjects: Project[]) => {
    if (searchTerm.trim().length > 0 || typeFilter !== "ALL") return true

    // 若用户手动设置了该分类的状态，则以用户的显式操作为准
    if (typeof expandedCategories[cat] === "boolean") {
      return expandedCategories[cat]
    }

    // 默认情况：若分类包含当前激活选中的项目，则自动展开
    return catProjects.some((p) => {
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
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="h-full border-r border-white/10 bg-[#0a0e17] flex flex-col shrink-0 overflow-hidden select-none z-30"
          role="region"
          aria-label="项目资源树抽屉"
        >
          {/* 内部固定 240px 容器，防止抽屉拉伸过度时文字挤压抖动 */}
          <div className="w-[240px] h-full flex flex-col shrink-0">
            {/* Drawer Header */}
            <div className="px-3.5 py-3 border-b border-white/10 bg-slate-900/40 backdrop-blur-sm flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Layers size={15} />
                </div>
                <span className="text-xs font-semibold text-slate-200 tracking-wider uppercase">
                  项目资源库
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                title="收起项目库 (Esc)"
                aria-label="收起项目库"
              >
                <PanelLeftClose size={15} />
              </button>
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
                  placeholder="搜索项目、分类或标签..."
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
                  className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all cursor-pointer text-center ${
                    typeFilter === "ALL"
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs font-semibold"
                      : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setTypeFilter("READING")}
                  className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    typeFilter === "READING"
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs font-semibold"
                      : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <BookOpen size={10} />
                  <span>阅读</span>
                </button>
                <button
                  onClick={() => setTypeFilter("PLAN")}
                  className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    typeFilter === "PLAN"
                      ? "bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-xs font-semibold"
                      : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <ListChecks size={10} />
                  <span>计划</span>
                </button>
              </div>
            </div>

            {/* Category Tree List */}
            <div
              role="tree"
              aria-label="分类树"
              className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]"
            >
              {categoryGroups.length === 0 ? (
                <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2">
                  <div className="p-3 rounded-full bg-white/5 text-slate-500 border border-white/5">
                    <FolderTree size={22} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    未找到匹配的项目分类
                  </span>
                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-medium mt-1 transition-colors"
                  >
                    重置搜索与筛选
                  </button>
                </div>
              ) : (
                categoryGroups.map(({ category, projects: catProjects }) => {
                  const expanded = isCategoryExpanded(category, catProjects)
                  return (
                    <div key={category} className="space-y-0.5" role="none">
                      {/* Category Folder Node */}
                      <button
                        onClick={() => toggleCategory(category)}
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
                            {category}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-medium text-slate-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-full shrink-0 group-hover:border-white/10 group-hover:text-slate-300 transition-all">
                          {catProjects.length}
                        </span>
                      </button>

                      {/* Sub Projects List */}
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
                            {catProjects.map((p) => {
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
                                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left group active:scale-[0.99] ${
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
            <div className="px-3 py-2 border-t border-white/10 bg-slate-950/40 flex items-center justify-between shrink-0 text-[10px] text-slate-400 select-none">
              <span className="font-mono">
                {categoryGroups.length} 分类 / {totalFilteredProjects} 项目
              </span>
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all text-slate-300 cursor-pointer font-medium"
                title="新建项目"
              >
                <Plus size={11} />
                <span>新建</span>
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
