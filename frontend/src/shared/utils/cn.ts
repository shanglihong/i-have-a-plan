import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 样式类名组合与 Tailwind 去重处理函数
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
