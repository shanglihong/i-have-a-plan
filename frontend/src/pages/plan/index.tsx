import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Cpu,
  RefreshCw,
  GitBranch,
  Clock,
  Zap,
  CheckCircle2,
} from "lucide-react"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { api } from "../../shared/api"

import { StatusBadge } from "../../shared/ui"
import { TASK_COLUMNS } from "../../shared/constants"

// ─── Plan Workspace Page ───────────────────────────────────────────────────────────

export default function PlanWorkspacePage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [view, setView] = useState<"kanban" | "gantt">("kanban")


  const { data: tasksData } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}/tasks`)
      return res.data
    },
  })

  const tasks = tasksData || []
  const [rescheduleTask, setRescheduleTask] = useState<string | null>(null)
  const [postponeDays, setPostponeDays] = useState(3)
  const [skillSearch, setSkillSearch] = useState("")
  const [compilingSkill, setCompilingSkill] = useState(false)
  const [compileComplete, setCompileComplete] = useState(false)

  // 快捷 Escape 键关闭弹窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRescheduleTask(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const rescheduleMutation = useMutation({
    mutationFn: async (payload: { taskId: string; postponeDays: number }) => {
      const res = await api.post("/tasks/reschedule", payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] })
      setRescheduleTask(null)
    },
  })

  const handleReschedule = (taskId: string) => {
    rescheduleMutation.mutate({ taskId, postponeDays })
  }

  const handleCompile = () => {
    setCompilingSkill(true)
    setTimeout(() => {
      setCompilingSkill(false)
      setCompileComplete(true)
    }, 3000)
  }

  const columns = TASK_COLUMNS


  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#090d16] text-slate-100">
      {/* Top bar */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3 shrink-0 bg-[#0c111d]">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Q3 产品发布计划
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            截止 2026-09-30 · 18 个任务
          </p>
        </div>
        <div className="flex-1" />

        {/* Compile notification */}
        <AnimatePresence>
          {compilingSkill && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 rounded-lg text-xs text-cyan-300 shadow-sm"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1,
                      delay: i * 0.2,
                      repeat: Infinity,
                    }}
                  />
                ))}
              </div>
              后台萃取编译中…
            </motion.div>
          )}
          {compileComplete && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs text-emerald-300 cursor-pointer hover:bg-emerald-500/25 transition-all shadow-sm font-medium"
              onClick={() => setCompileComplete(false)}
            >
              <CheckCircle2 size={14} />
              新技能萃取完成，点击前往审批 →
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skill inject search */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
          <Zap size={13} className="text-amber-400 shrink-0" />
          <input
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            placeholder="注入技能模板…"
            className="bg-transparent text-xs text-slate-100 placeholder-slate-400 outline-none w-32"
          />
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
          {(["kanban", "gantt"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer font-medium ${
                view === v
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {v === "kanban" ? "看板视图" : "甘特图"}
            </button>
          ))}
        </div>

        {/* Compile action */}
        <button
          onClick={handleCompile}
          disabled={compilingSkill}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-300 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <Cpu size={14} /> 萃取技能
        </button>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="flex-1 overflow-x-auto p-5">
          <div className="flex gap-5 min-w-max h-full">
            {columns.map((col) => (
              <div key={col.id} className="w-80 flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1 pb-1 border-b border-white/10">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <span className="text-xs font-semibold text-slate-200">
                    {col.label}
                  </span>
                  <span className="text-xs text-slate-400 bg-white/10 px-2 py-0.5 rounded-full font-mono font-medium ml-auto">
                    {tasks.filter((t) => t.status === col.id).length}
                  </span>
                </div>

                <div className="space-y-3">
                  {tasks
                    .filter((t) => t.status === col.id)
                    .map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        className={`bg-[#111827] border border-slate-700/80 rounded-xl p-3.5 relative shadow-md transition-all
                        ${task.status === "BLOCKED" ? "border-red-500/50" : ""}
                        ${task.status === "COMPLETED" ? "opacity-75" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-xs font-medium leading-relaxed ${task.status === "BLOCKED" ? "text-red-300" : "text-slate-100"}`}
                          >
                            {task.title}
                          </p>
                          {task.status === "BLOCKED" && (
                            <div className="relative">
                              <button
                                onClick={() => setRescheduleTask(task.id)}
                                className="text-[11px] text-red-300 bg-red-500/20 hover:bg-red-500/30 px-2 py-1 rounded-md border border-red-500/40 transition-all flex items-center gap-1 cursor-pointer font-medium"
                              >
                                <RefreshCw size={10} /> 重调度
                              </button>
                              <AnimatePresence>
                                {rescheduleTask === task.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.92 }}
                                    className="absolute right-0 top-8 z-30 bg-[#151d2a] border border-slate-700 rounded-xl p-3 w-56 shadow-2xl"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <p className="text-xs text-slate-300 mb-2 font-medium">
                                      顺延天数设置
                                    </p>
                                    <input
                                      type="number"
                                      value={postponeDays}
                                      onChange={(e) =>
                                        setPostponeDays(Number(e.target.value))
                                      }
                                      min={1}
                                      max={30}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 outline-none mb-3 font-mono"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setRescheduleTask(null)}
                                        className="flex-1 py-1 text-xs text-slate-300 bg-white/10 hover:bg-white/15 rounded-lg cursor-pointer"
                                      >
                                        取消
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleReschedule(task.id)
                                        }
                                        className="flex-1 py-1 text-xs font-semibold text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg cursor-pointer"
                                      >
                                        确认顺延
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <StatusBadge status={task.status} />
                          <span
                            className={`text-xs font-mono flex items-center gap-1 ${task.status === "BLOCKED" ? "text-red-400 font-semibold" : "text-slate-400"}`}
                          >
                            <Clock size={11} /> {task.deadline}
                          </span>
                        </div>

                        {task.deps.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800 text-xs text-slate-400">
                            <GitBranch size={12} className="text-slate-400 shrink-0" />
                            <span>依赖 {task.deps.length} 个前置节点</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gantt View */}
      {view === "gantt" && (
        <div className="flex-1 overflow-auto p-5">
          <div className="min-w-[700px] bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-4 mb-4 pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300 w-40 shrink-0">
                任务名称
              </span>
              <div className="flex-1 flex justify-around">
                {["7/10", "7/15", "7/20", "7/25", "7/30", "8/5"].map((d) => (
                  <span
                    key={d}
                    className="text-xs text-slate-400 font-mono text-center font-medium"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-300 w-20 text-right">
                状态
              </span>
            </div>
            <div className="space-y-3">
              {tasks.map((task) => {
                const start = parseInt(task.deadline.split("-")[2]) - 3
                const width = 3 + task.level * 2
                const offset = start - 8
                return (
                  <div key={task.id} className="flex items-center gap-4 py-1">
                    <span className="text-xs font-medium text-slate-200 w-40 shrink-0 truncate">
                      {task.title}
                    </span>
                    <div className="flex-1 relative h-8 bg-slate-900/60 rounded-lg overflow-hidden border border-white/5">
                      <motion.div
                        className={`absolute top-1 h-6 rounded-md flex items-center px-2.5 shadow-sm
                          ${
                            task.status === "COMPLETED"
                              ? "bg-emerald-500/30 border border-emerald-500/50 text-emerald-200"
                              : task.status === "RUNNING"
                                ? "bg-blue-500/30 border border-blue-500/50 text-blue-200"
                                : task.status === "BLOCKED"
                                  ? "bg-red-500/30 border border-red-500/50 text-red-200"
                                  : "bg-slate-700/50 border border-slate-600/50 text-slate-300"
                          }`}
                        style={{
                          left: `${Math.max(0, offset) * 44}px`,
                          width: `${width * 44}px`,
                        }}
                        initial={{ scaleX: 0, originX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <span className="text-xs font-medium truncate">
                          {task.title}
                        </span>
                      </motion.div>
                    </div>
                    <div className="w-20 text-right shrink-0">
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


