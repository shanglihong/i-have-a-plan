import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  public subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  public show(options: { type: ToastType; message: string; title?: string; duration?: number }) {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = options.duration ?? 4000;
    const item: ToastItem = {
      id,
      type: options.type,
      title: options.title,
      message: options.message,
      duration,
    };
    this.toasts = [...this.toasts, item];
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
    return id;
  }


  public dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  public error(message: string, title?: string, duration?: number) {
    return this.show({ type: "error", message, title, duration });
  }

  public success(message: string, title?: string, duration?: number) {
    return this.show({ type: "success", message, title, duration });
  }

  public info(message: string, title?: string, duration?: number) {
    return this.show({ type: "info", message, title, duration });
  }

  public warning(message: string, title?: string, duration?: number) {
    return this.show({ type: "warning", message, title, duration });
  }
}

export const toast = new ToastManager();

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe((updated) => setToasts(updated));
  }, []);

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((t) => {
          const config = getToastConfig(t.type);
          const Icon = config.icon;

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-2xl ${config.bg} ${config.border} ${config.text}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
              <div className="flex-1 min-w-0 pr-1">
                {t.title && <h4 className="text-sm font-semibold mb-0.5 leading-snug">{t.title}</h4>}
                <p className="text-xs opacity-90 leading-relaxed break-words">{t.message}</p>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                aria-label="关闭提示"
                className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

function getToastConfig(type: ToastType) {
  switch (type) {
    case "error":
      return {
        icon: AlertCircle,
        bg: "bg-rose-950/80",
        border: "border-rose-800/50",
        text: "text-rose-100",
        iconColor: "text-rose-400",
      };
    case "success":
      return {
        icon: CheckCircle2,
        bg: "bg-emerald-950/80",
        border: "border-emerald-800/50",
        text: "text-emerald-100",
        iconColor: "text-emerald-400",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        bg: "bg-amber-950/80",
        border: "border-amber-800/50",
        text: "text-amber-100",
        iconColor: "text-amber-400",
      };
    case "info":
    default:
      return {
        icon: Info,
        bg: "bg-cyan-950/80",
        border: "border-cyan-800/50",
        text: "text-cyan-100",
        iconColor: "text-cyan-400",
      };
  }
}
