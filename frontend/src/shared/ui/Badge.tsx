import React from "react";
import { cn } from "../utils/cn";

export type UIBadgeVariant = "cyan" | "violet" | "emerald" | "slate";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: UIBadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<UIBadgeVariant, string> = {
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
  violet: "text-violet-400 bg-violet-500/10 border-violet-500/25",
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  slate: "text-slate-400 bg-slate-500/10 border-slate-500/25",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "cyan", className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-mono font-semibold",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
