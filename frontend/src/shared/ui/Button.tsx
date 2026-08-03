import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../utils/cn";

export type ButtonVariant = "secondary" | "cyan" | "violet" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  secondary:
    "text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800/90 backdrop-blur-md border border-slate-700/80 hover:border-slate-500/80 shadow-md hover:shadow-cyan-950/40",
  cyan:
    "text-slate-950 font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-300 hover:from-cyan-300 hover:to-teal-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50",
  violet:
    "text-white font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/35 hover:shadow-violet-400/55",
  ghost: "text-slate-300 hover:text-white hover:bg-white/10",
  outline: "text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-500/80 bg-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-xs rounded-xl",
  lg: "px-5 py-3 text-sm rounded-xl",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      isLoading = false,
      disabled,
      className,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          "group inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer select-none",
          "hover:-translate-y-0.5 active:translate-y-0 active:scale-95",
          "disabled:opacity-50 disabled:pointer-events-none disabled:transform-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 size={14} className="animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
