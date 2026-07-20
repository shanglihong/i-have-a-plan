import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Library,
  BookOpen,
  ListChecks,
  Plus,
  Search,
  FolderCog,
  Edit2,
  Trash2,
  ArrowLeft,
  Grid,
  List,
  Check,
  FolderOpen,
  AlertTriangle,
} from "lucide-react"
import { useProjectsQuery } from "../../entities/project"
import { Project } from "../../shared/types"

export default function KnowledgeBaseManagerPage() {
  const navigate = useNavigate()
  const { data: projectsData, isLoading } = useProjectsQuery()

  const projects: Project[] = useMemo(() => {
    if (!projectsData?.items) return []
    return projectsData.items.map((item) => ({
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
  }, [projectsData])

  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [customKbs, setCustomKbs] = useState<string[]>([])
  const [deletedKbs, setDeletedKbs] = useState<string[]>([])
  const [newKbInput, setNewKbInput] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [editingKb, setEditingKb] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [deletingKb, setDeletingKb] = useState<string | null>(null)

  const kbList = useMemo(() => {
    const map: Record<string, Project[]> = {}

    projects.forEach((p) => {
      const name = p.tags && p.tags.length > 0 ? `${p.tags[0]} 知识库` : "默认知识库"
      if (!map[name]) map[name] = []
      map[name].push(p)
    })

    customKbs.forEach((name) => {
      if (!map[name]) map[name] = []
    })

    return Object.entries(map)
      .filter(([name]) => !deletedKbs.includes(name))
      .map(([name, list]) => {
        const reading = list.filter((p) => p.type === "READING").length
        const plan = list.filter((p) => p.type === "PLAN").length
        return {
          name,
          projects: list,
          readingCount: reading,
          planCount: plan,
          totalCount: list.length,
        }
      })
  }, [projects, customKbs, deletedKbs])

  const filteredKbList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return kbList
    return kbList.filter((kb) => kb.name.toLowerCase().includes(term))
  }, [kbList, searchTerm])

  const handleCreateKb = () => {
    const name = newKbInput.trim()
    if (name && !customKbs.includes(name)) {
      setCustomKbs((prev) => [...prev, name])
      setNewKbInput("")
      setIsAdding(false)
    }
  }

  const handleSaveRename = (oldName: string) => {
    const trimmed = editingName.trim()
    if (trimmed && trimmed !== oldName) {
      setCustomKbs((prev) => prev.map((n) => (n === oldName ? trimmed : n)))
    }
    setEditingKb(null)
  }

  const handleConfirmDelete = (name: string) => {
    setDeletedKbs((prev) => [...prev, name])
    setDeletingKb(null)
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#090d16] text-slate-100 p-6 md:p-8 select-none [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              title="返回"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FolderCog size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100">
                知识库管理中心
              </h1>
              <p className="text-xs text-slate-400">
                知识库文件夹的统一规划、项目分组与分类配置
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "grid"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
                title="网格视图"
              >
                <Grid size={15} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "list"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
                title="列表视图"
              >
                <List size={15} />
              </button>
            </div>

            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Plus size={16} />
              <span>新建知识库</span>
            </button>
          </div>
        </div>

        {/* Create Input Box */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-3"
            >
              <Library className="text-cyan-400 shrink-0" size={20} />
              <input
                type="text"
                autoFocus
                value={newKbInput}
                onChange={(e) => setNewKbInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateKb()}
                placeholder="请输入新知识库文件夹名称..."
                className="flex-1 px-3 py-2 text-xs bg-slate-900/90 border border-cyan-500/40 rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
              <button
                onClick={handleCreateKb}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all cursor-pointer"
              >
                确定创建
              </button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setNewKbInput("")
                }}
                className="px-3 py-2 text-xs rounded-xl text-slate-400 hover:bg-white/10 transition-all cursor-pointer"
              >
                取消
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 flex items-center">
            <Search
              size={15}
              className="absolute left-3.5 text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="按知识库文件夹名称搜索..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900/80 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>
        </div>

        {/* Main Content Area */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            知识库数据加载中...
          </div>
        ) : filteredKbList.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-2 text-slate-500">
            <FolderOpen size={36} className="text-slate-600" />
            <span className="text-sm font-medium">未找到任何知识库文件夹</span>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKbList.map((kb) => {
              const isEditing = editingKb === kb.name
              const isDeleting = deletingKb === kb.name

              return (
                <div
                  key={kb.name}
                  className={`p-5 rounded-2xl bg-slate-900/60 border transition-all flex flex-col justify-between group space-y-4 shadow-lg ${isDeleting
                    ? "border-rose-500/40 bg-rose-950/20"
                    : "border-white/10 hover:border-cyan-500/30"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                        <Library size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleSaveRename(kb.name)
                              }
                              className="px-2 py-1 text-xs bg-slate-950 border border-cyan-500/40 rounded text-slate-100 focus:outline-none w-full"
                            />
                            <button
                              onClick={() => handleSaveRename(kb.name)}
                              className="p-1 text-cyan-400 hover:bg-cyan-500/20 rounded cursor-pointer shrink-0"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                            {kb.name}
                          </h3>
                        )}
                        <span className="text-[11px] text-slate-400 font-mono">
                          包含 {kb.totalCount} 项关联内容
                        </span>
                      </div>
                    </div>

                    {!isDeleting && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingKb(kb.name)
                              setEditingName(kb.name)
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all cursor-pointer"
                            title="重命名"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingKb(kb.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline Delete Confirmation Banner */}
                  <AnimatePresence>
                    {isDeleting && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-1.5 text-rose-300 min-w-0">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span className="truncate">确认删除此知识库？</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleConfirmDelete(kb.name)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-all cursor-pointer"
                          >
                            确定删除
                          </button>
                          <button
                            onClick={() => setDeletingKb(null)}
                            className="px-2 py-1 text-[11px] rounded-lg text-slate-400 hover:bg-white/10 transition-all cursor-pointer"
                          >
                            取消
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Project Items Badges */}
                  <div className="flex items-center gap-4 text-xs pt-2 border-t border-white/5 text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={12} className="text-cyan-400" />
                      <span>{kb.readingCount} 阅读工程</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ListChecks size={12} className="text-violet-400" />
                      <span>{kb.planCount} 计划工程</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredKbList.map((kb) => {
              const isDeleting = deletingKb === kb.name
              const isEditing = editingKb === kb.name

              return (
                <div
                  key={kb.name}
                  className={`p-4 rounded-xl bg-slate-900/60 border transition-all flex items-center justify-between group ${isDeleting
                    ? "border-rose-500/40 bg-rose-950/20"
                    : "border-white/10 hover:border-cyan-500/30"
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                      <Library size={18} />
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveRename(kb.name)
                          }
                          className="px-2 py-1 text-xs bg-slate-950 border border-cyan-500/40 rounded text-slate-100 focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveRename(kb.name)}
                          className="p-1 text-cyan-400 hover:bg-cyan-500/20 rounded cursor-pointer"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-semibold text-slate-100 truncate">
                          {kb.name}
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          {kb.readingCount} 阅读 / {kb.planCount} 计划
                        </span>
                      </div>
                    )}
                  </div>

                  {isDeleting ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-rose-300">确认删除？</span>
                      <button
                        onClick={() => handleConfirmDelete(kb.name)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-all cursor-pointer"
                      >
                        确定
                      </button>
                      <button
                        onClick={() => setDeletingKb(null)}
                        className="px-2 py-1 text-xs rounded-lg text-slate-400 hover:bg-white/10 transition-all cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      {!isEditing && (
                        <button
                          onClick={() => {
                            setEditingKb(kb.name)
                            setEditingName(kb.name)
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all cursor-pointer"
                          title="重命名"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingKb(kb.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

