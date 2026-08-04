import React from "react";
import { cn } from "../utils/cn";

export interface UserAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  fallbackText?: string;
}

export const UserAvatar = React.forwardRef<HTMLDivElement, UserAvatarProps>(
  ({ fallbackText = "U", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        aria-label="用户个人中心"
        className={cn(
          "w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white cursor-pointer ring-2 ring-white/10 hover:ring-cyan-400 transition-all shadow-md",
          className
        )}
        {...props}
      >
        {fallbackText}
      </div>
    );
  }
);

UserAvatar.displayName = "UserAvatar";
