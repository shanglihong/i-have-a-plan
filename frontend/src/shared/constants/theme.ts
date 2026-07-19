// ─── Tailwind JIT 静态颜色映射常量 ───────────────────────────────────────────

export type ThemeColorKey = "cyan" | "violet" | "emerald" | "blue";

export interface ThemeColorStyle {
  bg: string;
  text: string;
  ring: string;
  hoverRing: string;
  hoverBg: string;
}

export const COLOR_MAP: Record<ThemeColorKey, ThemeColorStyle> = {
  cyan: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-400",
    ring: "ring-cyan-500/30",
    hoverRing: "hover:ring-cyan-500/40",
    hoverBg: "hover:bg-cyan-500/8",
  },
  violet: {
    bg: "bg-violet-500/15",
    text: "text-violet-400",
    ring: "ring-violet-500/30",
    hoverRing: "hover:ring-violet-500/40",
    hoverBg: "hover:bg-violet-500/8",
  },
  emerald: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    ring: "ring-emerald-500/30",
    hoverRing: "hover:ring-emerald-500/40",
    hoverBg: "hover:bg-emerald-500/8",
  },
  blue: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    ring: "ring-blue-500/30",
    hoverRing: "hover:ring-blue-500/40",
    hoverBg: "hover:bg-blue-500/8",
  },
};
