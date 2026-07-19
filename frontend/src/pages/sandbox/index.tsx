import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronsRight,
} from "lucide-react"

import { MOCK_SANDBOX_NODES } from "../../mock"

import { StatusBadge } from "../../shared/ui"

// ─── Skill Sandbox Page ─────────────────────────────────────────────────────────────

export default function SkillSandboxPage() {
  const [nodes, setNodes] = useState(MOCK_SANDBOX_NODES)
  const [edges] = useState(() =>
    MOCK_SANDBOX_NODES.flatMap((n) =>
      n.deps.map((dep) => ({ source: dep, target: n.id })),
    ),
  )
  const [hasCycle, setHasCycle] = useState(false)
  const [cycleNodes, setCycleNodes] = useState<string[]>([])
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const simulateCycleError = () => {
    setHasCycle(true)
    setCycleNodes(["s2", "s3", "s4"])
    setTimeout(() => {
      setHasCycle(false)
      setCycleNodes([])
    }, 4000)
  }

  const handleApprove = () => {
    if (hasCycle) return
    setApproving(true)
    setTimeout(() => {
      setApproving(false)
      setApproved(true)
    }, 1500)
  }

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setDraggingNode(nodeId)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setNodes((ns) =>
      ns.map((n) => (n.id === draggingNode ? { ...n, x: n.x + dx, y: n.y + dy } : n)),
    )
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const getNodePos = (id: string) => {
    const n = nodes.find((n) => n.id === id)
    return n ? { x: n.x + 80, y: n.y + 28 } : { x: 0, y: 0 }
  }

  const statusColors: Record<string, string> = {
    COMPLETED: "#34d399",
    ACTIVE: "#22d3ee",
    PENDING: "#64748b",
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#090d16] text-slate-100">
      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-[#070c16] cursor-default"
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDraggingNode(null)}
      >
        {/* Grid dots bg */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(148,163,184,0.18) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="absolute top-4 left-4 z-10 bg-[#0c111d]/90 p-3 rounded-xl border border-white/10 shadow-lg">
          <h2 className="text-sm font-semibold text-slate-100">
            技能沙箱编辑器
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            深度学习基础技能树 · 审批入库前验证
          </p>
        </div>

        {/* SVG edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {edges.map((edge, i) => {
            const s = getNodePos(edge.source)
            const t = getNodePos(edge.target)
            const isCycleEdge =
              cycleNodes.includes(edge.source) &&
              cycleNodes.includes(edge.target)
            const midX = (s.x + t.x) / 2
            return (
              <g key={i}>
                <path
                  d={`M ${s.x} ${s.y} C ${midX} ${s.y}, ${midX} ${t.y}, ${t.x} ${t.y}`}
                  fill="none"
                  stroke={
                    isCycleEdge
                      ? "rgba(248,113,113,0.9)"
                      : "rgba(148,163,184,0.4)"
                  }
                  strokeWidth={isCycleEdge ? 2.5 : 1.5}
                  strokeDasharray={isCycleEdge ? "6,4" : undefined}
                  className={isCycleEdge ? "animate-shake" : ""}
                />
                <circle
                  cx={t.x}
                  cy={t.y}
                  r={3.5}
                  fill={
                    isCycleEdge
                      ? "rgba(248,113,113,0.9)"
                      : "rgba(148,163,184,0.6)"
                  }
                />
              </g>
            )
          })}
        </svg>

        {/* Nodes list */}
        {nodes.map((node) => {
          const isCycleNode = cycleNodes.includes(node.id)
          const color = statusColors[node.status] || "#64748b"
          return (
            <motion.div
              key={node.id}
              className={`absolute w-40 select-none cursor-grab active:cursor-grabbing
                ${isCycleNode ? "cycle-error-glow animate-shake" : ""}`}
              style={{ left: node.x, top: node.y }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              animate={isCycleNode ? { x: [-3, 3, -3, 3, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <div
                className={`rounded-xl p-3.5 transition-all shadow-md
                ${isCycleNode ? "bg-red-500/15 ring-2 ring-red-500/70" : "bg-[#111827] border border-slate-700/80 hover:border-cyan-500/40"}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono text-slate-400 font-medium">
                    {node.id}
                  </span>
                  {isCycleNode && (
                    <AlertTriangle
                      size={12}
                      className="text-red-400 ml-auto"
                    />
                  )}
                </div>
                <p
                  className={`text-xs font-semibold leading-snug ${isCycleNode ? "text-red-300" : "text-slate-100"}`}
                >
                  {node.title}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {node.desc}
                </p>
                <div className="mt-2.5 pt-2 border-t border-slate-800">
                  <StatusBadge status={node.status} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Right Control Panel */}
      <aside className="w-70 border-l border-white/10 flex flex-col bg-[#0c111d] shrink-0">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-xs font-semibold text-slate-100 mb-1">
            拓扑排序与依赖检测
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            点击"批准入库"前，系统将自动执行有向无环图（DAG）检测，防止循环依赖导致技能死锁。
          </p>
        </div>

        {/* Status Indicator */}
        <div className="p-4 border-b border-white/10">
          <div
            className={`flex items-center gap-3 p-3 rounded-xl ${hasCycle ? "bg-red-500/15 border border-red-500/40 shadow-sm" : "bg-emerald-500/15 border border-emerald-500/30 shadow-sm"}`}
          >
            {hasCycle ? (
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            )}
            <div>
              <p
                className={`text-xs font-semibold ${hasCycle ? "text-red-300" : "text-emerald-300"}`}
              >
                {hasCycle ? "检测到循环死锁！" : "拓扑结构正常有效"}
              </p>
              {hasCycle && (
                <p className="text-xs text-red-400 mt-0.5 font-mono">
                  s2 → s3 → s4 → s2
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Node list preview */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {nodes.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border border-transparent ${cycleNodes.includes(n.id) ? "bg-red-500/15 border-red-500/30" : "bg-[#111827] border-slate-800 hover:border-slate-700"} transition-all`}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: statusColors[n.status] || "#64748b",
                }}
              />
              <span className="text-xs font-medium text-slate-200 flex-1 truncate">
                {n.title}
              </span>
              {n.deps.length > 0 && (
                <span className="text-xs text-slate-400 font-mono">
                  {n.deps.length} 前置
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-white/10 space-y-2.5 bg-[#090d16]">
          <button
            onClick={simulateCycleError}
            aria-label="模拟死锁错误"
            className="w-full py-2 text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <AlertTriangle size={14} /> 模拟死锁错误
          </button>

          {approved ? (
            <div className="w-full py-2.5 text-xs font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 rounded-lg flex items-center justify-center gap-1.5 shadow-sm">
              <CheckCircle2 size={14} /> 已通过审批入库
            </div>
          ) : (
            <button
              onClick={handleApprove}
              disabled={hasCycle || approving}
              aria-label="批准入库"
              className={`w-full py-2.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md
                ${
                  hasCycle
                    ? "bg-slate-800/80 text-slate-500 border-slate-700/50 cursor-not-allowed"
                    : approving
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30"
                }`}
            >
              {approving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <RefreshCw size={14} />
                  </motion.div>
                  校验中…
                </>
              ) : (
                <>
                  <ChevronsRight size={14} />
                  {hasCycle ? "存在死锁，禁止入库" : "批准入库"}
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}


