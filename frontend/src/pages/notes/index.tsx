import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Plus,
  Search,
  BookOpen,
  ListChecks,
  Sparkles,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  X,
  ChevronsUpDown,
  RotateCcw,
  PanelLeftClose,
} from "lucide-react"
import { NoteDocumentItem } from "./utils/exportUtils"
import { NoteDocumentEditor } from "./components/NoteDocumentEditor"
import { NotesPickerDrawer } from "./components/NotesPickerDrawer"
import { MOCK_READING_NOTES_FALLBACK, MOCK_PROJECTS_DATA } from "../../mock"
import { NoteCardData } from "../reading/components/UnifiedNoteCard"

const INITIAL_NOTE_DOCUMENTS: NoteDocumentItem[] = [
  {
    id: "doc_1",
    title: "Linux 网络协议栈与 TCP 拥塞控制推导",
    updatedAt: "10分钟前",
    projectId: "1",
    projectName: "深入理解 Linux 内核架构与网络协议栈",
    blocks: [
      {
        id: "b1",
        type: "text",
        content: "TCP BBR 算法与传统的 CUBIC 算法在拥塞窗口控制上的区别在于：BBR 依赖于实时测量 Bottleneck Bandwidth 和 RTT。",
      },
      {
        id: "b2",
        type: "note_card",
        noteData: {
          id: "note_01",
          quote: "Socket 缓冲区发送队列与 sk_buff 结构体的链表管理在 kernel 5.x 中进行了 cacheline 优化。",
          content: "sk_buff 的内存分配是 Linux 网络处理性能瓶颈之一，需结合 slab 分配器理解。",
          anchor: "Linux 内核架构 P.128",
          createdAt: "10分钟前",
        },
      },
    ],
  },
  {
    id: "doc_2",
    title: "Graph RAG 拓扑社区发现与知识图谱构建",
    updatedAt: "1小时前",
    projectId: "2",
    projectName: "Graph RAG 知识检索与引擎落地工程",
    blocks: [
      {
        id: "b3",
        type: "text",
        content: "针对长文本复杂问答的召回瓶颈，结合 Graph RAG 构建实体-关系图谱，可极大缓解传统 Vector RAG 的语义断层。",
      },
      {
        id: "b4",
        type: "note_card",
        noteData: {
          id: "note_02",
          quote: "Graph RAG 通过将文本切片构建为实体-关系图谱，利用拓扑社区发现算法提升复杂推理召回率。",
          content: "拓扑社区发现（如 Leiden 算法）能够聚类层次化摘要，生成多粒度的上下文描述。",
          anchor: "Graph RAG 论文精读 Chapter 3",
          createdAt: "1小时前",
        },
      },
    ],
  },
  {
    id: "doc_3",
    title: "React 18 并发机制与 Scheduler 调度原理",
    updatedAt: "昨天",
    projectId: "3",
    projectName: "TypeScript & React 高级设计模式精读",
    blocks: [
      {
        id: "b5",
        type: "note_card",
        noteData: {
          id: "note_03",
          quote: "React 18 concurrent mode 通过 startTransition 标记非紧急渲染，避免阻塞主线程卡顿。",
          content: "Scheduler 基于 MessageChannel 模拟 requestIdleCallback 进行时间片分发。",
          anchor: "React 源码解析 Chapter 5",
          createdAt: "昨天",
        },
      },
    ],
  },
  {
    id: "doc_4",
    title: "eBPF 字节码 JIT 编译与 Kernel Tracepoint",
    updatedAt: "3天前",
    projectId: "4",
    projectName: "ebpf 动态追踪与性能调优最佳实践",
    blocks: [
      {
        id: "b6",
        type: "text",
        content: "eBPF 提供安全的高效内核探针，无需重编译内核或加载内核模块即可获取调用图谱。",
      },
    ],
  },
  {
    id: "doc_5",
    title: "未分类知识点速记与闪念笔记",
    updatedAt: "4天前",
    blocks: [
      {
        id: "b7",
        type: "text",
        content: "待归档的通用思考与临时摘录。",
      },
    ],
  },
]

type SidebarFilterCategory = "ALL" | "READING" | "PLAN" | "UNCATEGORIZED"

export default function NotesHubPage() {
  const [documents, setDocuments] = useState<NoteDocumentItem[]>(INITIAL_NOTE_DOCUMENTS)
  const [activeDocId, setActiveDocId] = useState<string>("doc_1")
  const [docSearchTerm, setDocSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<SidebarFilterCategory>("ALL")
  const [pickerDrawerOpen, setPickerDrawerOpen] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0]

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }))
  }

  // 项目文件夹分组
  const projectGroups = useMemo(() => {
    const term = docSearchTerm.trim().toLowerCase()

    const map: Record<
      string,
      { id: string; name: string; type?: string; docs: NoteDocumentItem[] }
    > = {}

    // 填入已定义的 mock 项目
    MOCK_PROJECTS_DATA.forEach((p) => {
      map[p.id] = {
        id: p.id,
        name: p.title,
        type: p.type,
        docs: [],
      }
    })

    // 未分类项目分组
    const UNKNOW_PROJECT_ID = "uncategorized"
    map[UNKNOW_PROJECT_ID] = {
      id: UNKNOW_PROJECT_ID,
      name: "未分类笔记",
      docs: [],
    }

    // 将文档分配到对应项目
    documents.forEach((doc) => {
      if (
        term &&
        !doc.title.toLowerCase().includes(term) &&
        !(doc.projectName && doc.projectName.toLowerCase().includes(term))
      ) {
        return
      }

      const pid = doc.projectId && map[doc.projectId] ? doc.projectId : UNKNOW_PROJECT_ID
      map[pid].docs.push(doc)
    })

    return Object.values(map).filter((group) => {
      if (group.docs.length === 0) return false

      if (filterType === "READING") return group.type === "READING"
      if (filterType === "PLAN") return group.type === "PLAN"
      if (filterType === "UNCATEGORIZED") return group.id === "uncategorized"

      return true
    })
  }, [documents, docSearchTerm, filterType])

  // 批量展开/收起全部
  const handleToggleExpandAll = () => {
    const allIds = projectGroups.map((g) => g.id)
    const isAllExpanded = allIds.every((id) => expandedProjects[id] !== false)

    const nextState: Record<string, boolean> = {}
    allIds.forEach((id) => {
      nextState[id] = !isAllExpanded
    })
    setExpandedProjects(nextState)
  }

  const isProjectExpanded = (projectId: string, groupDocs: NoteDocumentItem[]) => {
    if (docSearchTerm.trim().length > 0) return true

    if (typeof expandedProjects[projectId] === "boolean") {
      return expandedProjects[projectId]
    }

    if (groupDocs.some((d) => d.id === activeDocId)) {
      return true
    }

    return true
  }

  const handleCreateDocument = (projectId?: string, projectName?: string) => {
    const targetProj = MOCK_PROJECTS_DATA.find((p) => p.id === projectId)
    const newDoc: NoteDocumentItem = {
      id: `doc_${Date.now()}`,
      title: "新建知识输出文档",
      updatedAt: "刚刚",
      projectId: projectId || targetProj?.id,
      projectName: projectName || targetProj?.title,
      blocks: [],
    }
    setDocuments((prev) => [newDoc, ...prev])
    setActiveDocId(newDoc.id)
    if (projectId) {
      setExpandedProjects((prev) => ({ ...prev, [projectId]: true }))
    }
  }

  const handleUpdateDocument = (updated: NoteDocumentItem) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  const handleInsertNoteToCurrentDoc = (note: NoteCardData) => {
    if (!activeDoc) return
    const newBlock = {
      id: `block_${Date.now()}`,
      type: "note_card" as const,
      noteData: note,
    }
    const updated = {
      ...activeDoc,
      blocks: [...activeDoc.blocks, newBlock],
      updatedAt: "刚刚",
    }
    handleUpdateDocument(updated)
    setPickerDrawerOpen(false)
  }

  const handleResetFilters = () => {
    setDocSearchTerm("")
    setFilterType("ALL")
  }

  // 匹配统计计算
  const totalMatchingDocs = useMemo(() => {
    return projectGroups.reduce((acc, g) => acc + g.docs.length, 0)
  }, [projectGroups])

  return (
    <div className="h-full flex overflow-hidden bg-[#090D16] text-slate-100 font-sans select-none">
      {/* ── Left Side: Notes Documents Explorer Sidebar (Collapsible 0-Width Mode) ── */}
      <motion.aside
        animate={{ width: isSidebarCollapsed ? 0 : 340 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className={`h-full bg-[#0a0e17] flex flex-col shrink-0 overflow-hidden select-none z-20 relative ${
          isSidebarCollapsed ? "border-r-0" : "border-r border-white/10"
        }`}
        role="region"
        aria-label="知识输出中心侧边栏"
      >
        <div className="w-[340px] h-full flex flex-col shrink-0">
          {/* Sidebar Header (Aligned Height h-14 & border-white/10 with NoteDocumentEditor) */}
          <div className="px-3.5 h-14 border-b border-white/10 bg-[#0a0e17] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <Sparkles size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-200 tracking-wider uppercase truncate">
                知识输出中心
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {documents.length} 文档
              </span>
            </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleToggleExpandAll}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  title="全部展开 / 收起"
                  aria-label="全部展开或收起"
                >
                  <ChevronsUpDown size={15} />
                </button>

                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  title="收起侧边栏"
                  aria-label="收起侧边栏"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>
            </div>

            {/* Search Box & Type Filter Pills (Identical to KnowledgeBaseTreeDrawer) */}
            <div className="px-3 py-2.5 shrink-0 border-b border-white/5 bg-slate-950/20 space-y-2">
              {/* Search Bar */}
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={docSearchTerm}
                  onChange={(e) => setDocSearchTerm(e.target.value)}
                  placeholder="搜索项目或文档..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                />
                {docSearchTerm && (
                  <button
                    onClick={() => setDocSearchTerm("")}
                    className="absolute right-2 text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
                    title="清空搜索"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Type Filter Pills (Identical to KnowledgeBaseTreeDrawer) */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilterType("ALL")}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all cursor-pointer text-center ${
                    filterType === "ALL"
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs font-semibold"
                      : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setFilterType("READING")}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    filterType === "READING"
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs font-semibold"
                      : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <BookOpen size={11} />
                  <span>阅读</span>
                </button>
                <button
                  onClick={() => setFilterType("PLAN")}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    filterType === "PLAN"
                      ? "bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-xs font-semibold"
                      : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <ListChecks size={11} />
                  <span>计划</span>
                </button>
              </div>
            </div>

            {/* Documents Tree Stream (项目作为文件夹, 完全对齐 KnowledgeBaseTreeDrawer 结构) */}
            <div
              role="tree"
              aria-label="笔记项目文件夹树"
              className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]"
            >
              {projectGroups.length === 0 ? (
                <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2">
                  <div className="p-3 rounded-full bg-white/5 text-slate-500 border border-white/5">
                    <FolderPlus size={22} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">未找到符合条件的笔记文档</span>
                  {(docSearchTerm || filterType !== "ALL") && (
                    <button
                      onClick={handleResetFilters}
                      className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-medium mt-1 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      <span>重置搜索与筛选</span>
                    </button>
                  )}
                </div>
              ) : (
                projectGroups.map((group) => {
                  const expanded = isProjectExpanded(group.id, group.docs)
                  const isUncategorized = group.id === "uncategorized"

                  return (
                    <div key={group.id} className="space-y-0.5" role="none">
                      {/* Folder Node Header (Project Icon directly marks READING vs PLAN) */}
                      <button
                        onClick={() => toggleProjectExpanded(group.id)}
                        role="treeitem"
                        aria-expanded={expanded}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-slate-300 hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer group text-left"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <ChevronRight
                            size={14}
                            className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                              expanded ? "rotate-90 text-slate-200" : ""
                            }`}
                          />
                          {group.type === "READING" ? (
                            <BookOpen
                              size={14}
                              className={expanded ? "text-cyan-400 shrink-0" : "text-cyan-400/70 group-hover:text-cyan-300 shrink-0"}
                            />
                          ) : group.type === "PLAN" ? (
                            <ListChecks
                              size={14}
                              className={expanded ? "text-violet-400 shrink-0" : "text-violet-400/70 group-hover:text-violet-300 shrink-0"}
                            />
                          ) : expanded ? (
                            <FolderOpen size={14} className="text-cyan-400 shrink-0" />
                          ) : (
                            <Folder size={14} className="text-slate-400 group-hover:text-slate-300 shrink-0" />
                          )}
                          <span className="text-xs font-semibold truncate text-slate-200 group-hover:text-cyan-300 transition-colors">
                            {group.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <span className="text-xs font-mono font-medium text-slate-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-full shrink-0 group-hover:border-white/10 group-hover:text-slate-300 transition-all">
                            {group.docs.length}
                          </span>

                          {!isUncategorized && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCreateDocument(group.id, group.name)
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded transition-all cursor-pointer"
                              title={`在【${group.name}】下新建笔记`}
                              role="button"
                              tabIndex={0}
                            >
                              <Plus size={12} />
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Documents List under Folder Node (Notes use original FileText Icon) */}
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
                            {group.docs.map((doc) => {
                              const isActive = activeDocId === doc.id
                              const isPlanType = group.type === "PLAN"

                              return (
                                <button
                                  key={doc.id}
                                  onClick={() => setActiveDocId(doc.id)}
                                  role="treeitem"
                                  aria-selected={isActive}
                                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-all cursor-pointer text-left group active:scale-[0.99] ${
                                    isActive
                                      ? isPlanType
                                        ? "bg-violet-500/15 text-violet-200 font-semibold border border-violet-500/30 shadow-xs shadow-violet-950/40"
                                        : "bg-cyan-500/15 text-cyan-200 font-semibold border border-cyan-500/30 shadow-xs shadow-cyan-950/40"
                                      : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <FileText
                                      size={13}
                                      className={
                                        isActive
                                          ? isPlanType
                                            ? "text-violet-300 shrink-0"
                                            : "text-cyan-300 shrink-0"
                                          : "text-slate-500 shrink-0 group-hover:text-slate-300 transition-colors"
                                      }
                                    />
                                    <span className="truncate">{doc.title}</span>
                                  </div>

                                  <div
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1.5 ${
                                      isActive
                                        ? isPlanType
                                          ? "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.5)]"
                                          : "bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                                        : "bg-slate-600/60 group-hover:bg-slate-500 transition-colors"
                                    }`}
                                    title={`最后编辑: ${doc.updatedAt}`}
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

            {/* Footer Summary & Action Bar (Aligned with KnowledgeBaseTreeDrawer) */}
            <div className="px-3 py-2 border-t border-white/10 bg-slate-950/40 flex items-center justify-between shrink-0 text-xs text-slate-400 select-none">
              <span className="font-mono">
                {projectGroups.length} 项目 / {totalMatchingDocs} 文档
              </span>
              <div className="flex items-center gap-1 text-emerald-400/90 text-[11px]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>可导出</span>
              </div>
            </div>
          </div>
      </motion.aside>

      {/* ── Right Side: Main Workspace Block Editor ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeDoc ? (
          <NoteDocumentEditor
            document={activeDoc}
            onUpdateDocument={handleUpdateDocument}
            onOpenNotesPicker={() => setPickerDrawerOpen(true)}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed(false)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
            <BookOpen size={32} className="text-slate-700" />
            <span>选择或新建一个融合笔记文档进行编辑</span>
          </div>
        )}
      </main>

      {/* ── Available Notes Picker Drawer ── */}
      <NotesPickerDrawer
        isOpen={pickerDrawerOpen}
        onClose={() => setPickerDrawerOpen(false)}
        availableNotes={MOCK_READING_NOTES_FALLBACK}
        onInsertNote={handleInsertNoteToCurrentDoc}
      />
    </div>
  )
}

