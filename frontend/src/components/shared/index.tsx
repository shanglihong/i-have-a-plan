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

// ─── Shared Components ───────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE: {
      label: "进行中",
      cls: "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30",
    },
    SUSPENDED: {
      label: "休眠中",
      cls: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
    },
    ARCHIVED: {
      label: "已归档",
      cls: "bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30",
    },
    PARSING: {
      label: "解析中",
      cls: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30",
    },
    COMPLETED: {
      label: "已完成",
      cls: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
    },
    RUNNING: {
      label: "执行中",
      cls: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30",
    },
    BLOCKED: {
      label: "已阻塞",
      cls: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30 animate-breathe",
    },
    PENDING: {
      label: "待解锁",
      cls: "bg-slate-500/15 text-slate-500 ring-1 ring-slate-500/20",
    },
  };
  const { label, cls } = map[status] || {
    label: status,
    cls: "bg-slate-700 text-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono ${cls}`}
    >
      {label}
    </span>
  );
}

export function ProgressBar({
  value,
  color = "cyan",
}: {
  value: number;
  color?: string;
}) {
  const colors: Record<string, string> = {
    cyan: "bg-cyan-400",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    violet: "bg-violet-400",
  };
  return (
    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        className={`h-full ${colors[color] || colors.cyan} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

export function SuspendedOverlay({
  onResume,
}: {
  onResume: () => void;
}) {
  const [ripple, setRipple] = useState(false);
  const handleResume = () => {
    setRipple(true);
    setTimeout(() => {
      setRipple(false);
      onResume();
    }, 900);
  };
  return (
    <div className="absolute inset-0 z-20 backdrop-blur-sm bg-[#0a0e1a]/70 flex items-center justify-center rounded-lg overflow-hidden">
      {ripple && (
        <div className="absolute w-32 h-32 rounded-full bg-cyan-400/30 ripple-effect" />
      )}
      <div className="text-center relative z-10">
        <div className="w-12 h-12 rounded-full bg-amber-500/20 ring-1 ring-amber-500/40 flex items-center justify-center mx-auto mb-3">
          <Unlock size={20} className="text-amber-400" />
        </div>
        <p className="text-sm text-slate-400 mb-4">
          项目已休眠
        </p>
        <button
          onClick={handleResume}
          className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 ring-1 ring-cyan-500/50 text-cyan-300 rounded-lg text-sm font-medium transition-all"
        >
          一键唤醒
        </button>
      </div>
    </div>
  );
}

