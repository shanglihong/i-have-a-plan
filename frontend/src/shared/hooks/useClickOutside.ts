import { useEffect, RefObject } from "react"

/**
 * Shared 层通用 Hook：监听目标 DOM 元素外部的点击与触摸事件
 *
 * @param ref 目标 DOM 元素的引用
 * @param handler 点击外部时的回调函数
 * @param enabled 是否开启监听（默认 true）
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current
      if (!el || el.contains(event.target as Node)) {
        return
      }
      handler(event)
    }

    document.addEventListener("mousedown", listener)
    document.addEventListener("touchstart", listener)

    return () => {
      document.removeEventListener("mousedown", listener)
      document.removeEventListener("touchstart", listener)
    }
  }, [ref, handler, enabled])
}
