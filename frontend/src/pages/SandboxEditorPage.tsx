import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  AlertTriangle,
  Plus,
  Link2,
  ArrowRight,
  Cpu,
  GripVertical,
  CheckCircle2,
  Lock,
  RefreshCw,
} from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../api'

// ─── Mock skill data (GET /api/skills/:id — [未开发，需 Mock]) ────────────────

interface SkillNode {
  id: string
  title: string
  description: string
  x: number
  y: number
  level: 'L1' | 'L2' | 'L3'
  dependencies: string[]
  hasCycleError?: boolean
}

const initialNodes: SkillNode[] = [
  {
    id: 'sn1',
    title: '确定阅读目标',
    description: '明确本次阅读的核心问题与预期收获，建立心智框架',
    x: 80,
    y: 80,
    level: 'L1',
    dependencies: [],
  },
  {
    id: 'sn2',
    title: '快速浏览结构',
    description: '扫描目录、摘要、标题，建立对文本的整体地图',
    x: 340,
    y: 60,
    level: 'L1',
    dependencies: ['sn1'],
  },
  {
    id: 'sn3',
    title: '精读核心章节',
    description: '对重点段落进行深度阅读，划词标注，提出问题',
    x: 340,
    y: 200,
    level: 'L2',
    dependencies: ['sn2'],
  },
  {
    id: 'sn4',
    title: '批判性分析',
    description: '质疑作者论点，寻找逻辑漏洞，结合先验知识验证',
    x: 600,
    y: 130,
    level: 'L2',
    dependencies: ['sn2', 'sn3'],
  },
  {
    id: 'sn5',
    title: '费曼复述检验',
    description: '用自己的语言向初学者解释核心概念，验证理解深度',
    x: 600,
    y: 280,
    level: 'L2',
    dependencies: ['sn3'],
  },
  {
    id: 'sn6',
    title: '沉淀为笔记技能',
    description: '将阅读洞见提炼为可复用的知识节点，链入知识图谱',
    x: 860,
    y: 200,
    level: 'L3',
    dependencies: ['sn4', 'sn5'],
  },
]

const levelColors: Record<string, string> = {
  L1: 'var(--success)',
  L2: 'var(--primary)',
  L3: 'var(--accent)',
}

const levelLabels: Record<string, string> = {
  L1: '基础技能',
  L2: '进阶技能',
  L3: '沉淀技能',
}

// ─── Cycle detection ─────────────────────────────────────────────────────────

function detectCycle(nodes: SkillNode[]): string[] {
  const adj: Record<string, string[]> = {}
  nodes.forEach((n) => { adj[n.id] = n.dependencies })

  const visited: Record<string, boolean> = {}
  const inStack: Record<string, boolean> = {}
  let cyclePath: string[] = []

  function dfs(id: string, path: string[]): boolean {
    visited[id] = true
    inStack[id] = true

    for (const dep of (adj[id] || [])) {
      if (!visited[dep]) {
        if (dfs(dep, [...path, dep])) return true
      } else if (inStack[dep]) {
        cyclePath = [...path, id, dep]
        return true
      }
    }
    inStack[id] = false
    return false
  }

  for (const node of nodes) {
    if (!visited[node.id]) {
      if (dfs(node.id, [node.id])) return cyclePath
    }
  }
  return []
}

// ─── Node card ───────────────────────────────────────────────────────────────

function NodeCard({
  node,
  cycleIds,
  onDrag,
  selected,
  onSelect,
}: {
  node: SkillNode
  cycleIds: string[]
  onDrag: (id: string, dx: number, dy: number) => void
  selected: string | null
  onSelect: (id: string) => void
}) {
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const hasCycle = cycleIds.includes(node.id)

  function handleMouseDown(e: React.MouseEvent) {
    e.stopPropagation()
    dragRef.current = { x: e.clientX, y: e.clientY }
    onSelect(node.id)

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.x
      const dy = ev.clientY - dragRef.current.y
      dragRef.current = { x: ev.clientX, y: ev.clientY }
      onDrag(node.id, dx, dy)
    }
    function onUp() {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const isSelected = selected === node.id

  return (
    <motion.div
      style={{ left: node.x, top: node.y, position: 'absolute', width: 200, background: 'var(--card)' }}
      animate={
        hasCycle
          ? { x: [0, -4, 4, -3, 3, 0], transition: { duration: 0.4 } }
          : {}
      }
      className={`rounded-xl border cursor-grab active:cursor-grabbing select-none ${
        hasCycle
          ? 'border-[var(--danger)] ring-2 ring-[var(--danger)] shadow-[0_0_20px_rgba(248,113,113,0.3)]'
          : isSelected
          ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]'
          : 'border-[var(--border)] hover:border-[rgba(255,255,255,0.15)]'
      } transition-all`}
      onMouseDown={handleMouseDown}
    >
      {/* Level tag */}
      <div
        className="px-3 py-2 rounded-t-xl border-b border-[var(--border)] flex items-center justify-between"
        style={{ background: hasCycle ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: hasCycle ? 'var(--danger)' : levelColors[node.level] }}
          />
          <span
            className="text-[10px] font-mono"
            style={{ color: hasCycle ? 'var(--danger)' : levelColors[node.level] }}
          >
            {node.level} · {levelLabels[node.level]}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <GripVertical size={10} className="text-[var(--muted-foreground)]" />
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5" style={{ background: 'var(--card)' }}>
        <p className="text-xs font-semibold text-[var(--foreground)] mb-1">{node.title}</p>
        <p className="text-[10px] text-[var(--muted-foreground)] leading-snug line-clamp-2">
          {node.description}
        </p>
        {node.dependencies.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
            <Link2 size={8} />
            {node.dependencies.length} 个前置依赖
          </div>
        )}
        {hasCycle && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--danger)]">
            <AlertTriangle size={9} />
            检测到循环依赖
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SandboxEditorPage() {
  const { skill_id } = useParams()
  const [nodes, setNodes] = useState<SkillNode[]>(initialNodes)
  const [selected, setSelected] = useState<string | null>(null)
  const [cycleError, setCycleError] = useState<string[]>([])
  const [approveSuccess, setApproveSuccess] = useState(false)
  const [showCycleModal, setShowCycleModal] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  function handleDrag(id: string, dx: number, dy: number) {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n))
    )
  }

  const approveMutation = useMutation({
    mutationFn: async () => {
      const cycle = detectCycle(nodes)
      const res = await api.post(`/skills/${skill_id || 'test'}/approve`, { cyclePath: cycle })
      return res.data
    },
    onSuccess: () => {
      setApproveSuccess(true)
    },
    onError: (error: any) => {
      if (error?.extension_fields?.cycle_path) {
        setCycleError(error.extension_fields.cycle_path)
        setShowCycleModal(true)
      }
    }
  })

  function handleApprove() {
    approveMutation.mutate()
  }

  function injectCycleForDemo() {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === 'sn1' ? { ...n, dependencies: [...n.dependencies, 'sn6'] } : n
      )
    )
    const cycle = detectCycle(
      nodes.map((n) =>
        n.id === 'sn1' ? { ...n, dependencies: [...n.dependencies, 'sn6'] } : n
      )
    )
    setCycleError(cycle)
    setShowCycleModal(cycle.length > 0)
  }

  function resetCycle() {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === 'sn1' ? { ...n, dependencies: n.dependencies.filter((d) => d !== 'sn6') } : n
      )
    )
    setCycleError([])
    setShowCycleModal(false)
  }

  // SVG edges
  function edgePath(src: SkillNode, tgt: SkillNode) {
    const x1 = src.x + 200
    const y1 = src.y + 55
    const x2 = tgt.x
    const y2 = tgt.y + 55
    const mx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
  }

  const cycleIdSet = new Set(cycleError)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div
        className="px-6 py-3 border-b border-[var(--border)] flex items-center gap-4 shrink-0"
        style={{ background: 'var(--muted)' }}
      >
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-[var(--accent)]" />
          <span className="font-display text-lg text-[var(--foreground)]">
            技能沙箱 · 批判性阅读框架
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border border-[var(--border)] text-[var(--warning)]">
            SANDBOX
          </span>
        </div>

        <div className="flex-1" />

        {/* Demo: inject cycle */}
        <button
          onClick={cycleError.length ? resetCycle : injectCycleForDemo}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
            cycleError.length
              ? 'border-[var(--success)] text-[var(--success)] hover:bg-[rgba(52,211,153,0.1)]'
              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {cycleError.length ? <><RefreshCw size={11} />重置依赖</> : <><AlertTriangle size={11} />模拟死锁</>}
        </button>

        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all">
          <Plus size={12} />
          添加节点
        </button>

        {/* Approve button */}
        <button
          onClick={handleApprove}
          disabled={cycleError.length > 0 || approveSuccess}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            cycleError.length > 0
              ? 'bg-[var(--danger)] text-white opacity-50 cursor-not-allowed'
              : approveSuccess
              ? 'bg-[var(--success)] text-[var(--background)]'
              : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90'
          }`}
        >
          {approveSuccess ? (
            <><CheckCircle2 size={12} />已入库</>
          ) : cycleError.length > 0 ? (
            <><Lock size={12} />死锁已阻断</>
          ) : (
            <><Check size={12} />批准入库</>
          )}
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Main canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto scrollbar-hidden"
          style={{ background: 'var(--background)' }}
          onClick={() => setSelected(null)}
        >
          {/* Background grid */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 1200, minHeight: 600 }}>
            <defs>
              <pattern id="sandbox-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.7" fill="rgba(255,255,255,0.03)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sandbox-grid)" />

            {/* Edges */}
            {nodes.map((node) =>
              node.dependencies.map((depId) => {
                const dep = nodes.find((n) => n.id === depId)
                if (!dep) return null
                const isCycleEdge = cycleIdSet.has(node.id) && cycleIdSet.has(depId)

                return (
                  <g key={`${node.id}-${depId}`}>
                    <path
                      d={edgePath(dep, node)}
                      fill="none"
                      stroke={isCycleEdge ? 'var(--danger)' : 'rgba(255,255,255,0.12)'}
                      strokeWidth={isCycleEdge ? 2 : 1.5}
                      strokeDasharray={isCycleEdge ? '5,5' : undefined}
                    />
                    {/* Arrowhead */}
                    <circle
                      cx={node.x}
                      cy={node.y + 55}
                      r="3"
                      fill={isCycleEdge ? 'var(--danger)' : 'rgba(255,255,255,0.2)'}
                    />
                  </g>
                )
              })
            )}
          </svg>

          {/* Nodes */}
          <div className="relative" style={{ minWidth: 1200, minHeight: 600 }}>
            {nodes.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                cycleIds={[...cycleIdSet]}
                onDrag={handleDrag}
                selected={selected}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>

        {/* Right sidebar: detail panel */}
        <div
          className="w-60 shrink-0 border-l border-[var(--border)] flex flex-col"
          style={{ background: 'var(--muted)' }}
        >
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--foreground)]">技能概览</p>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hidden p-3 space-y-3">
            {/* Stats */}
            <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
              {[
                { label: '节点总数', val: nodes.length, color: 'var(--foreground)' },
                { label: 'L1 基础节点', val: nodes.filter((n) => n.level === 'L1').length, color: 'var(--success)' },
                { label: 'L2 进阶节点', val: nodes.filter((n) => n.level === 'L2').length, color: 'var(--primary)' },
                { label: 'L3 沉淀节点', val: nodes.filter((n) => n.level === 'L3').length, color: 'var(--accent)' },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--muted-foreground)]">{s.label}</span>
                  <span className="text-xs font-mono" style={{ color: s.color }}>{s.val}</span>
                </div>
              ))}
            </div>

            {/* Cycle error detail */}
            {cycleError.length > 0 && (
              <div className="rounded-xl border border-[var(--danger)] p-3"
                style={{ background: 'rgba(248,113,113,0.06)' }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={11} className="text-[var(--danger)]" />
                  <span className="text-[10px] font-semibold text-[var(--danger)]">拓扑死锁检测</span>
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)] mb-2">
                  RFC 7807 · errors/topology-cycle
                </p>
                <div className="space-y-1">
                  {cycleError.map((id) => {
                    const node = nodes.find((n) => n.id === id)
                    return node ? (
                      <div key={id} className="flex items-center gap-1.5 text-[10px] text-[var(--danger)]">
                        <span className="w-1 h-1 rounded-full bg-[var(--danger)]" />
                        {node.title}
                      </div>
                    ) : null
                  })}
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-2">
                  「批准入库」按钮已被阻断
                </p>
              </div>
            )}

            {/* Node list */}
            <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-1">
              节点列表
            </p>
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  selected === node.id
                    ? 'border-[var(--primary)] bg-[rgba(34,211,238,0.06)]'
                    : 'border-[var(--border)] hover:bg-[var(--secondary)]'
                } ${cycleIdSet.has(node.id) ? 'border-[var(--danger)]' : ''}`}
                onClick={() => setSelected(node.id)}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{
                    background: cycleIdSet.has(node.id)
                      ? 'var(--danger)'
                      : levelColors[node.level],
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-[var(--foreground)] truncate">
                    {node.title}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono">{node.level}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cycle error modal */}
      <AnimatePresence>
        {showCycleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backdropFilter: 'blur(12px)', background: 'rgba(8,9,12,0.7)' }}
          >
            <motion.div
              initial={{ scale: 0.93, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 10 }}
              className="w-full max-w-sm mx-4 rounded-2xl border border-[var(--danger)] overflow-hidden shadow-2xl"
              style={{ background: 'var(--card)' }}
            >
              <div
                className="px-5 py-4 flex items-center gap-3 border-b border-[var(--border)]"
                style={{ background: 'rgba(248,113,113,0.06)' }}
              >
                <div className="w-9 h-9 rounded-xl bg-[rgba(248,113,113,0.15)] flex items-center justify-center">
                  <AlertTriangle size={18} className="text-[var(--danger)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">拓扑环路检测</h3>
                  <p className="text-[10px] text-[var(--danger)] font-mono">errors/topology-cycle · status 400</p>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-[var(--card-foreground)]">
                  依赖解析失败，检测到步骤循环依赖。批准入库已被阻断。
                </p>
                <div className="rounded-lg border border-[var(--border)] p-3 font-mono text-[10px]"
                  style={{ background: 'var(--secondary)' }}
                >
                  <p className="text-[var(--muted-foreground)] mb-1">cycle_path:</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {cycleError.map((id, i) => {
                      const node = nodes.find((n) => n.id === id)
                      return (
                        <span key={id} className="flex items-center gap-1 text-[var(--danger)]">
                          {node?.title || id}
                          {i < cycleError.length - 1 && (
                            <ArrowRight size={8} className="text-[var(--muted-foreground)]" />
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  请在画布上删除造成环路的依赖连线后再次尝试批准。
                </p>
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={() => setShowCycleModal(false)}
                  className="w-full py-2.5 rounded-xl bg-[var(--secondary)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  返回画布修复
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approve success overlay */}
      <AnimatePresence>
        {approveSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 rounded-full bg-[rgba(52,211,153,0.15)] border border-[var(--success)] flex items-center justify-center">
                <CheckCircle2 size={36} className="text-[var(--success)]" />
              </div>
              <p className="text-lg font-display text-[var(--foreground)]">技能已成功入库</p>
              <p className="text-sm text-[var(--muted-foreground)]">「批判性阅读框架」已移至 active 目录</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
