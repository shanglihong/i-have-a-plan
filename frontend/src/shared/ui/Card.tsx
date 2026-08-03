import React from "react";
import { cn } from "../utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ interactive = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md shadow-xl shadow-slate-950/20",
          interactive && "hover:border-slate-700/80 transition-all duration-300",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5 border-b border-white/5", className)} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-base font-bold text-slate-100 tracking-tight", className)} {...props}>
      {children}
    </h3>
  )
);
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("p-5", className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = "CardContent";
