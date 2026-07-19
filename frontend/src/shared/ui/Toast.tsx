import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X, ChevronRight } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";
export type ToastPosition = "top-center" | "top-right" | "bottom-right" | "top-left";

export interface ToastAction {
  label: string;
  onClick: (id: string) => void;
}

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  details?: string;
  action?: ToastAction;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  details?: string;
  action?: ToastAction;
  duration: number; // 毫秒，0 表示不自动销毁
  createdAt: number;
  remaining: number;
  isPaused: boolean;
}

type ToastListener = (toasts: ToastItem[], position: ToastPosition) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private timers: Map<string, { timerId: NodeJS.Timeout; startTime: number }> = new Map();
  private position: ToastPosition = "top-center";

  public setPosition(pos: ToastPosition) {
    this.position = pos;
    this.notify();
  }

  public getPosition(): ToastPosition {
    return this.position;
  }

  public subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener(this.toasts, this.position);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts], this.position));
  }

  public show(options: ToastOptions): string {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = options.duration ?? 4500;
    const now = Date.now();

    const item: ToastItem = {
      id,
      type: options.type || "info",
      title: options.title,
      message: options.message,
      details: options.details,
      action: options.action,
      duration,
      createdAt: now,
      remaining: duration,
      isPaused: false,
    };

    // 最多保持 5 条，超过时移出最早的非 pause Toast
    if (this.toasts.length >= 5) {
      const oldestId = this.toasts[0]?.id;
      if (oldestId) this.dismiss(oldestId);
    }

    this.toasts = [...this.toasts, item];
    this.notify();

    if (duration > 0) {
      this.startTimer(id, duration);
    }

    return id;
  }

  private startTimer(id: string, duration: number) {
    this.clearTimer(id);
    const startTime = Date.now();
    const timerId = setTimeout(() => {
      this.dismiss(id);
    }, duration);

    this.timers.set(id, { timerId, startTime });
  }

  private clearTimer(id: string) {
    const existing = this.timers.get(id);
    if (existing) {
      clearTimeout(existing.timerId);
      this.timers.delete(id);
    }
  }

  public pause(id: string) {
    const item = this.toasts.find((t) => t.id === id);
    const timerInfo = this.timers.get(id);
    if (!item || !timerInfo || item.isPaused) return;

    const elapsed = Date.now() - timerInfo.startTime;
    const remaining = Math.max(0, item.remaining - elapsed);

    this.clearTimer(id);

    this.toasts = this.toasts.map((t) =>
      t.id === id ? { ...t, remaining, isPaused: true } : t
    );
    this.notify();
  }

  public resume(id: string) {
    const item = this.toasts.find((t) => t.id === id);
    if (!item || !item.isPaused || item.remaining <= 0) return;

    this.toasts = this.toasts.map((t) =>
      t.id === id ? { ...t, isPaused: false } : t
    );
    this.notify();

    if (item.remaining > 0) {
      this.startTimer(id, item.remaining);
    }
  }

  public dismiss(id: string) {
    this.clearTimer(id);
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  public clear() {
    this.timers.forEach((t) => clearTimeout(t.timerId));
    this.timers.clear();
    this.toasts = [];
    this.notify();
  }

  public error(
    message: string,
    titleOrOptions?: string | Omit<ToastOptions, "message" | "type">,
    duration?: number
  ) {
    if (typeof titleOrOptions === "object") {
      return this.show({ ...titleOrOptions, message, type: "error" });
    }
    return this.show({ type: "error", message, title: titleOrOptions, duration });
  }

  public success(
    message: string,
    titleOrOptions?: string | Omit<ToastOptions, "message" | "type">,
    duration?: number
  ) {
    if (typeof titleOrOptions === "object") {
      return this.show({ ...titleOrOptions, message, type: "success" });
    }
    return this.show({ type: "success", message, title: titleOrOptions, duration });
  }

  public info(
    message: string,
    titleOrOptions?: string | Omit<ToastOptions, "message" | "type">,
    duration?: number
  ) {
    if (typeof titleOrOptions === "object") {
      return this.show({ ...titleOrOptions, message, type: "info" });
    }
    return this.show({ type: "info", message, title: titleOrOptions, duration });
  }

  public warning(
    message: string,
    titleOrOptions?: string | Omit<ToastOptions, "message" | "type">,
    duration?: number
  ) {
    if (typeof titleOrOptions === "object") {
      return this.show({ ...titleOrOptions, message, type: "warning" });
    }
    return this.show({ type: "warning", message, title: titleOrOptions, duration });
  }
}

export const toast = new ToastManager();

interface ToastContainerProps {
  position?: ToastPosition;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ position: propPosition }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [position, setPosition] = useState<ToastPosition>(propPosition || "top-center");

  useEffect(() => {
    return toast.subscribe((updatedToasts, currentPosition) => {
      setToasts(updatedToasts);
      setPosition(propPosition || currentPosition);
    });
  }, [propPosition]);

  const getPositionClasses = (pos: ToastPosition) => {
    switch (pos) {
      case "top-center":
        return "top-6 left-1/2 -translate-x-1/2 items-center";
      case "top-right":
        return "top-6 right-6 items-end";
      case "bottom-right":
        return "bottom-6 right-6 items-end";
      case "top-left":
        return "top-6 left-6 items-start";
      default:
        return "top-6 left-1/2 -translate-x-1/2 items-center";
    }
  };

  return (
    <div
      tabIndex={-1}
      className={`fixed z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0 transition-all duration-300 ${getPositionClasses(
        position
      )}`}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastCard key={t.id} toastItem={t} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastCardProps {
  toastItem: ToastItem;
}

const ToastCard: React.FC<ToastCardProps> = ({ toastItem }) => {
  const config = getToastConfig(toastItem.type);
  const Icon = config.icon;
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    toast.pause(toastItem.id);
  };

  const handleMouseLeave = () => {
    toast.resume(toastItem.id);
  };

  const isError = toastItem.type === "error";

  return (
    <motion.div
      ref={cardRef}
      layout
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      initial={{ opacity: 0 }}
      animate={
        isError
          ? {
              opacity: 1,
              x: [0, -4, 4, -2, 2, 0],
            }
          : { opacity: 1 }
      }
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={
        isError
          ? { duration: 0.35, ease: "easeOut" }
          : { duration: 0.2, ease: "easeOut" }
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto relative overflow-hidden flex items-start gap-3.5 p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 shadow-xl ${config.bg} ${config.border} ${config.glow}`}
      style={{ width: "100%", maxWidth: "440px" }}
    >
      {/* Accent Left Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.accentBar}`} />

      {/* Icon Badge */}
      <div className={`shrink-0 p-2.5 rounded-xl border flex items-center justify-center ${config.iconBadgeBg}`}>
        <Icon className={`w-5 h-5 ${config.iconColor}`} />
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 pt-0.5">
        {toastItem.title && (
          <h4 className={`text-sm font-semibold mb-1 leading-snug tracking-tight ${config.titleColor}`}>
            {toastItem.title}
          </h4>
        )}
        <p className={`text-xs leading-relaxed break-words font-normal ${config.textColor}`}>
          {toastItem.message}
        </p>

        {/* Technical Details Code Block (if provided) */}
        {toastItem.details && (
          <div className="mt-2 text-[11px] font-mono bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-slate-300 break-all max-h-24 overflow-y-auto select-all">
            {toastItem.details}
          </div>
        )}

        {/* Action Button (if provided) */}
        {toastItem.action && (
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={() => {
                toastItem.action?.onClick(toastItem.id);
              }}
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg border transition-all hover:scale-[1.02] active:scale-95 ${config.actionBtnClass}`}
            >
              <span>{toastItem.action.label}</span>
              <ChevronRight className="w-3 h-3 opacity-70" />
            </button>
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        onClick={() => toast.dismiss(toastItem.id)}
        aria-label="关闭提示"
        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 -mr-1"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar Component */}
      {toastItem.duration > 0 && (
        <ProgressBar
          duration={toastItem.duration}
          remaining={toastItem.remaining}
          isPaused={toastItem.isPaused}
          colorClass={config.progressBg}
        />
      )}
    </motion.div>
  );
};

interface ProgressBarProps {
  duration: number;
  remaining: number;
  isPaused: boolean;
  colorClass: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ duration, remaining, isPaused, colorClass }) => {
  const [progressRatio, setProgressRatio] = useState(remaining / duration);

  useEffect(() => {
    if (isPaused) return;

    const intervalTime = 50;
    const startTime = Date.now();
    const initialRemaining = remaining;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentRemaining = Math.max(0, initialRemaining - elapsed);
      const ratio = currentRemaining / duration;

      setProgressRatio(ratio);

      if (currentRemaining <= 0) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPaused, remaining, duration]);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/5 overflow-hidden">
      <div
        className={`h-full transition-all duration-75 ease-linear rounded-full ${colorClass}`}
        style={{
          width: `${Math.max(0, Math.min(100, progressRatio * 100))}%`,
          opacity: isPaused ? 0.6 : 1,
        }}
      />
    </div>
  );
};

function getToastConfig(type: ToastType) {
  switch (type) {
    case "error":
      return {
        icon: AlertCircle,
        bg: "bg-gradient-to-r from-[#1c0d15]/95 via-[#140e1a]/95 to-[#0f1424]/95",
        border: "border-rose-500/40",
        glow: "shadow-[0_10px_35px_rgba(244,63,94,0.22)]",
        accentBar: "bg-gradient-to-b from-rose-400 to-rose-600",
        iconBadgeBg: "bg-rose-500/15 border-rose-500/30",
        iconColor: "text-rose-400",
        titleColor: "text-rose-100",
        textColor: "text-rose-200/90",
        actionBtnClass: "bg-rose-500/20 text-rose-200 border-rose-500/40 hover:bg-rose-500/30",
        progressBg: "bg-gradient-to-r from-rose-500 to-rose-400",
      };
    case "success":
      return {
        icon: CheckCircle2,
        bg: "bg-gradient-to-r from-[#0a1c15]/95 via-[#0e191f]/95 to-[#0d1424]/95",
        border: "border-emerald-500/40",
        glow: "shadow-[0_10px_35px_rgba(16,185,129,0.18)]",
        accentBar: "bg-gradient-to-b from-emerald-400 to-emerald-600",
        iconBadgeBg: "bg-emerald-500/15 border-emerald-500/30",
        iconColor: "text-emerald-400",
        titleColor: "text-emerald-100",
        textColor: "text-emerald-200/90",
        actionBtnClass: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30",
        progressBg: "bg-gradient-to-r from-emerald-500 to-emerald-400",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        bg: "bg-gradient-to-r from-[#1c160a]/95 via-[#191512]/95 to-[#0d1424]/95",
        border: "border-amber-500/40",
        glow: "shadow-[0_10px_35px_rgba(245,158,11,0.18)]",
        accentBar: "bg-gradient-to-b from-amber-400 to-amber-600",
        iconBadgeBg: "bg-amber-500/15 border-amber-500/30",
        iconColor: "text-amber-400",
        titleColor: "text-amber-100",
        textColor: "text-amber-200/90",
        actionBtnClass: "bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30",
        progressBg: "bg-gradient-to-r from-amber-500 to-amber-400",
      };
    case "info":
    default:
      return {
        icon: Info,
        bg: "bg-gradient-to-r from-[#0a1824]/95 via-[#0d1726]/95 to-[#0f1424]/95",
        border: "border-cyan-500/40",
        glow: "shadow-[0_10px_35px_rgba(6,182,212,0.18)]",
        accentBar: "bg-gradient-to-b from-cyan-400 to-cyan-600",
        iconBadgeBg: "bg-cyan-500/15 border-cyan-500/30",
        iconColor: "text-cyan-400",
        titleColor: "text-cyan-100",
        textColor: "text-cyan-200/90",
        actionBtnClass: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30",
        progressBg: "bg-gradient-to-r from-cyan-500 to-cyan-400",
      };
  }
}
