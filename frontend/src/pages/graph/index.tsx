import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ZoomIn, ZoomOut, Maximize2, X } from "lucide-react"

import {
  MOCK_GRAPH_NODES,
  MOCK_GRAPH_EDGES,
} from "../../shared/mock/data"

// ─── Global Graph Page ──────────────────────────────────────────────────────────────

export default function GlobalGraphPage() {
  const [peekNode, setPeekNode] = useState<
    (typeof MOCK_GRAPH_NODES)[0] | null
  >(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [positions, setPositions] = useState(() =>
    Object.fromEntries(
      MOCK_GRAPH_NODES.map((n) => [n.id, { x: n.x, y: n.y }]),
    ),
  )
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ dx: 0, dy: 0 })

  // 快捷 Escape 键关闭 Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPeekNode(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleNodeMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
  ) => {
    e.stopPropagation()
    const pos = positions[nodeId]
    dragOffset.current = {
      dx: e.clientX - pos.x * zoom,
      dy: e.clientY - pos.y * zoom,
    }
    setDragging(nodeId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    setPositions((p) => ({
      ...p,
      [dragging]: {
        x: (e.clientX - dragOffset.current.dx) / zoom,
        y: (e.clientY - dragOffset.current.dy) / zoom,
      },
    }))
  }

  const typeColors: Record<string, string> = {
    concept: "#22d3ee",
    method: "#a78bfa",
    model: "#34d399",
    problem: "#f87171",
  }

  return (
    <div
      className="h-full relative overflow-hidden bg-[#070c16] text-slate-100 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDragging(null)}
    >
      {/* Controls Floating Bar */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="glass rounded-xl p-3.5 text-xs space-y-2.5 border border-white/10 shadow-lg">
          <p className="text-slate-300 font-semibold mb-2 tracking-wide">
            节点图例
          </p>
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2.5">
              <div
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-300 font-medium">
                {type === "concept"
                  ? "概念"
                  : type === "method"
                    ? "方法"
                    : type === "model"
                      ? "模型"
                      : "问题"}
              </span>
            </div>
          ))}
          <div className="border-t border-white/10 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 border-t border-dashed border-red-400/60" />
              <span className="text-slate-400">已被证伪</span>
            </div>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="glass rounded-xl p-1.5 flex flex-col gap-1 border border-white/10 shadow-lg">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
            aria-label="放大画布"
            className="p-2 text-slate-300 hover:text-slate-100 hover:bg-white/10 transition-colors rounded-lg cursor-pointer"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            aria-label="缩小画布"
            className="p-2 text-slate-300 hover:text-slate-100 hover:bg-white/10 transition-colors rounded-lg cursor-pointer"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={() => setZoom(1)}
            aria-label="重置缩放比例"
            className="p-2 text-slate-300 hover:text-slate-100 hover:bg-white/10 transition-colors rounded-lg cursor-pointer"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Top right Node Stats */}
      <div className="absolute top-4 right-4 z-10 glass rounded-xl px-3.5 py-2 text-xs text-slate-300 border border-white/10 font-medium shadow-lg">
        <span className="font-mono text-cyan-400 font-bold">
          {MOCK_GRAPH_NODES.length}
        </span>{" "}
        节点 ·{" "}
        <span className="font-mono text-cyan-400 font-bold">
          {MOCK_GRAPH_EDGES.length}
        </span>{" "}
        关联边
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={canvasRef}
        className="w-full h-full"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <filter id="glow">
              <feGaussianBlur
                stdDeviation="3"
                result="coloredBlur"
              />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {MOCK_GRAPH_EDGES.map((edge, i) => {
            const s = positions[edge.source]
            const t = positions[edge.target]
            const sNode = MOCK_GRAPH_NODES.find((n) => n.id === edge.source)
            const tNode = MOCK_GRAPH_NODES.find((n) => n.id === edge.target)
            const isFalsified = sNode?.is_falsified || tNode?.is_falsified
            return (
              <line
                key={i}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={
                  isFalsified
                    ? "rgba(248,113,113,0.4)"
                    : "rgba(148,163,184,0.35)"
                }
                strokeWidth={1.5}
                strokeDasharray={isFalsified ? "5,5" : undefined}
              />
            )
          })}
        </svg>

        {MOCK_GRAPH_NODES.map((node) => {
          const pos = positions[node.id]
          const color = typeColors[node.type] || "#94a3b8"
          return (
            <motion.div
              key={node.id}
              className="absolute cursor-pointer select-none group"
              style={{
                left: pos.x - node.size / 2,
                top: pos.y - node.size / 2,
                opacity: node.is_falsified ? 0.5 : 1,
              }}
              whileHover={{ scale: 1.18 }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onClick={(e) => {
                e.stopPropagation()
                if (!dragging) setPeekNode(node)
              }}
            >
              <div
                className="rounded-full flex items-center justify-center transition-all shadow-md"
                style={{
                  width: node.size,
                  height: node.size,
                  backgroundColor: `${color}30`,
                  border: `1.8px solid ${color}aa`,
                  boxShadow: `0 0 ${node.size / 2}px ${color}40`,
                }}
              />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap text-xs text-slate-200 bg-[#0c111d]/95 px-2 py-0.5 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20">
                {node.label}
                {node.is_falsified && (
                  <span className="ml-1 text-red-400 font-semibold">
                    已证伪
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Quick Peek Modal Panel */}
      <AnimatePresence>
        {peekNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
            onClick={() => setPeekNode(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ duration: 0.2 }}
              className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-[520px] max-h-[480px] overflow-y-auto shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: typeColors[peekNode.type],
                      }}
                    />
                    <span className="text-xs text-slate-400 font-mono uppercase font-semibold">
                      {peekNode.type}
                    </span>
                    {peekNode.is_falsified && (
                      <span className="text-xs text-red-400 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/30 font-medium">
                        已被证伪
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    {peekNode.label}
                  </h3>
                </div>
                <button
                  onClick={() => setPeekNode(null)}
                  aria-label="关闭详情"
                  className="text-slate-400 hover:text-slate-100 transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div
                className={`p-4 rounded-xl bg-white/5 border border-white/10 mb-4 ${peekNode.is_falsified ? "opacity-70" : ""}`}
              >
                <p className="text-sm text-slate-200 leading-relaxed">
                  {peekNode.label === "梯度消失问题"
                    ? "梯度消失问题（Vanishing Gradient Problem）是早期深层神经网络训练中的核心挑战。当使用 Sigmoid 等饱和激活函数时，反向传播过程中梯度信号会随层数增加而指数衰减，导致浅层网络几乎无法学习。该问题已基本被 ReLU 激活函数与残差连接（ResNet）所解决，在现代网络架构中已不再是主要瓶颈。"
                    : peekNode.label === "RNN时序建模"
                      ? "RNN（循环神经网络）曾是序列数据处理的主流方法，通过隐藏状态在时间步之间传递信息。然而其顺序计算特性导致无法并行化，且存在长距离依赖问题。随着 Transformer 架构于 2017 年提出，RNN 在 NLP 领域的主导地位已基本被取代。"
                      : `关于 ${peekNode.label} 的知识节点。这个概念来源于「深度学习基础理论精读」项目的第三章笔记提炼，与 ${MOCK_GRAPH_EDGES.filter((e) => e.source === peekNode.id || e.target === peekNode.id).length} 个相关概念存在直接依赖关系。`}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-medium">
                  关联节点：
                </span>
                {MOCK_GRAPH_EDGES.filter(
                  (e) =>
                    e.source === peekNode.id || e.target === peekNode.id,
                )
                  .slice(0, 4)
                  .map((e, i) => {
                    const otherId =
                      e.source === peekNode.id ? e.target : e.source
                    const other = MOCK_GRAPH_NODES.find((n) => n.id === otherId)
                    return other ? (
                      <button
                        key={i}
                        onClick={() => setPeekNode(other)}
                        className="text-xs text-slate-300 bg-white/10 hover:bg-cyan-500/20 hover:text-cyan-300 px-2.5 py-1 rounded-lg border border-white/10 transition-all cursor-pointer"
                      >
                        {other.label}
                      </button>
                    ) : null
                  })}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 font-mono">
                <span>来源：深度学习基础理论精读</span>
                <span className="text-slate-500">支持 Escape 键快速关闭</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

