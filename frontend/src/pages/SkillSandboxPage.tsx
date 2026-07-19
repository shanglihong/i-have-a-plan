import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  NavLink,
  useNavigate,
  Navigate,
} from "react-router-dom";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  Network,
  Cpu,
  Search,
  Bell,
  Plus,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  Bookmark,
  Zap,
  Archive,
  Play,
  MoreHorizontal,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  FileText,
  MessageSquare,
  Sparkles,
  Target,
  Map,
  Settings,
  TrendingUp,
  Circle,
  Minus,
  ChevronsRight,
  Lock,
  Unlock,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";


import { 
  MOCK_PROJECTS, MOCK_NOTES, MOCK_TASKS, 
  MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES, MOCK_SANDBOX_NODES 
} from "../mock/data";

import { StatusBadge, ProgressBar, SuspendedOverlay } from "../shared/ui";


// ─── Skill Sandbox ─────────────────────────────────────────────────────────────

export default function SkillSandboxPage() {
  const [nodes, setNodes] = useState(MOCK_SANDBOX_NODES);
  const [edges] = useState(() =>
    MOCK_SANDBOX_NODES.flatMap((n) =>
      n.deps.map((dep) => ({ source: dep, target: n.id })),
    ),
  );
  const [hasCycle, setHasCycle] = useState(false);
  const [cycleNodes, setCycleNodes] = useState<string[]>([]);
  const [draggingNode, setDraggingNode] = useState<
    string | null
  >(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const simulateCycleError = () => {
    setHasCycle(true);
    setCycleNodes(["s2", "s3", "s4"]);
    setTimeout(() => {
      setHasCycle(false);
      setCycleNodes([]);
    }, 4000);
  };

  const handleApprove = () => {
    if (hasCycle) return;
    setApproving(true);
    setTimeout(() => {
      setApproving(false);
      setApproved(true);
    }, 1500);
  };

  const handleNodeMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
  ) => {
    e.stopPropagation();
    setDraggingNode(nodeId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setNodes((ns) =>
      ns.map((n) =>
        n.id === draggingNode
          ? { ...n, x: n.x + dx, y: n.y + dy }
          : n,
      ),
    );
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const getNodePos = (id: string) => {
    const n = nodes.find((n) => n.id === id);
    return n ? { x: n.x + 80, y: n.y + 28 } : { x: 0, y: 0 };
  };

  const statusColors: Record<string, string> = {
    COMPLETED: "#34d399",
    ACTIVE: "#22d3ee",
    PENDING: "#475569",
  };

  return (
    <div className="h-full flex overflow-hidden">
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
              "radial-gradient(circle, rgba(100,116,139,0.15) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="absolute top-4 left-4 z-10">
          <h2 className="text-sm font-semibold text-slate-200">
            技能沙箱编辑器
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-mono">
            深度学习基础技能树 · 审批入库前验证
          </p>
        </div>

        {/* SVG edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {edges.map((edge, i) => {
            const s = getNodePos(edge.source);
            const t = getNodePos(edge.target);
            const isCycleEdge =
              cycleNodes.includes(edge.source) &&
              cycleNodes.includes(edge.target);
            const midX = (s.x + t.x) / 2;
            return (
              <g key={i}>
                <path
                  d={`M ${s.x} ${s.y} C ${midX} ${s.y}, ${midX} ${t.y}, ${t.x} ${t.y}`}
                  fill="none"
                  stroke={
                    isCycleEdge
                      ? "rgba(248,113,113,0.8)"
                      : "rgba(100,116,139,0.4)"
                  }
                  strokeWidth={isCycleEdge ? 2 : 1.5}
                  strokeDasharray={
                    isCycleEdge ? "6,4" : undefined
                  }
                  className={isCycleEdge ? "animate-shake" : ""}
                />
                {/* Arrow */}
                <circle
                  cx={t.x}
                  cy={t.y}
                  r={3}
                  fill={
                    isCycleEdge
                      ? "rgba(248,113,113,0.8)"
                      : "rgba(100,116,139,0.5)"
                  }
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const isCycleNode = cycleNodes.includes(node.id);
          const color = statusColors[node.status] || "#475569";
          return (
            <motion.div
              key={node.id}
              className={`absolute w-40 select-none cursor-grab active:cursor-grabbing
                ${isCycleNode ? "cycle-error-glow animate-shake" : ""}`}
              style={{ left: node.x, top: node.y }}
              onMouseDown={(e) =>
                handleNodeMouseDown(e, node.id)
              }
              animate={
                isCycleNode ? { x: [-3, 3, -3, 3, 0] } : {}
              }
              transition={{ duration: 0.4 }}
            >
              <div
                className={`rounded-xl p-3 transition-all
                ${isCycleNode ? "bg-red-500/10 ring-2 ring-red-500/60" : "glass hover:ring-1 hover:ring-white/15"}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] font-mono text-slate-500">
                    {node.id}
                  </span>
                  {isCycleNode && (
                    <AlertTriangle
                      size={10}
                      className="text-red-400 ml-auto"
                    />
                  )}
                </div>
                <p
                  className={`text-xs font-medium leading-snug ${isCycleNode ? "text-red-300" : "text-slate-200"}`}
                >
                  {node.title}
                </p>
                <p className="text-[10px] text-slate-600 mt-1">
                  {node.desc}
                </p>
                <div className="mt-2 pt-2 border-t border-white/5">
                  <StatusBadge status={node.status} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Right panel */}
      <aside className="w-64 border-l border-white/5 flex flex-col bg-[#0d1320] shrink-0">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-xs font-medium text-slate-300 mb-1">
            拓扑排序验证
          </h3>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            点击"批准入库"前，系统将执行严格的有向无环图（DAG）检测，防止循环依赖导致技能死锁。
          </p>
        </div>

        {/* Status */}
        <div className="p-4 border-b border-white/5">
          <div
            className={`flex items-center gap-2 p-3 rounded-xl ${hasCycle ? "bg-red-500/10 ring-1 ring-red-500/30" : "bg-emerald-500/10 ring-1 ring-emerald-500/20"}`}
          >
            {hasCycle ? (
              <AlertTriangle
                size={14}
                className="text-red-400"
              />
            ) : (
              <CheckCircle2
                size={14}
                className="text-emerald-400"
              />
            )}
            <div>
              <p
                className={`text-xs font-medium ${hasCycle ? "text-red-300" : "text-emerald-300"}`}
              >
                {hasCycle ? "检测到循环依赖！" : "拓扑结构有效"}
              </p>
              {hasCycle && (
                <p className="text-[10px] text-red-400/70 mt-0.5 font-mono">
                  s2 → s3 → s4 → s2
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Node list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {nodes.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${cycleNodes.includes(n.id) ? "bg-red-500/10" : "hover:bg-white/5"} transition-colors`}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    statusColors[n.status] || "#475569",
                }}
              />
              <span className="text-xs text-slate-400 flex-1 truncate">
                {n.title}
              </span>
              {n.deps.length > 0 && (
                <span className="text-[10px] text-slate-700 font-mono">
                  {n.deps.length}前置
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-3 border-t border-white/5 space-y-2">
          <button
            onClick={simulateCycleError}
            className="w-full py-2 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 ring-1 ring-amber-500/20 rounded-lg transition-all flex items-center justify-center gap-1.5"
          >
            <AlertTriangle size={12} /> 模拟死锁错误
          </button>

          {approved ? (
            <div className="w-full py-2.5 text-xs text-emerald-300 bg-emerald-500/15 ring-1 ring-emerald-500/30 rounded-lg flex items-center justify-center gap-1.5">
              <CheckCircle2 size={12} /> 已批准入库
            </div>
          ) : (
            <button
              onClick={handleApprove}
              disabled={hasCycle || approving}
              className={`w-full py-2.5 text-xs font-medium rounded-lg ring-1 transition-all flex items-center justify-center gap-1.5
                ${
                  hasCycle
                    ? "bg-slate-800 text-slate-600 ring-white/5 cursor-not-allowed"
                    : approving
                      ? "bg-cyan-500/20 text-cyan-400 ring-cyan-500/30"
                      : "bg-cyan-500/20 text-cyan-300 ring-cyan-500/40 hover:bg-cyan-500/30"
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
                    <RefreshCw size={12} />
                  </motion.div>
                  校验中…
                </>
              ) : (
                <>
                  <ChevronsRight size={12} />
                  {hasCycle ? "存在死锁，禁止入库" : "批准入库"}
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

