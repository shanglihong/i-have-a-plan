import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ZoomIn, ZoomOut, RotateCw, X } from "lucide-react"
import { cn } from "../utils/cn"

export interface ImageLightboxModalProps {
  isOpen: boolean
  src: string
  alt?: string
  onClose: () => void
}

export function ImageLightboxModal({
  isOpen,
  src,
  alt,
  onClose,
}: ImageLightboxModalProps) {
  // 图像交互控制：缩放倍率与旋转角度
  const [zoomScale, setZoomScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)

  // 当弹窗状态改变时重置缩放与旋转
  useEffect(() => {
    if (isOpen) {
      setZoomScale(1.0)
      setRotation(0)
    }
  }, [isOpen])

  const handleZoomIn = useCallback(() => {
    setZoomScale((prev) => Math.min(3.5, Number((prev + 0.25).toFixed(2))))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomScale((prev) => Math.max(0.6, Number((prev - 0.25).toFixed(2))))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoomScale(1.0)
    setRotation(0)
  }, [])

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
  }, [])

  // 鼠标滚轮缩放处理
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation()
    if (e.deltaY < 0) {
      handleZoomIn()
    } else {
      handleZoomOut()
    }
  }

  // 监听 Esc 键快捷关闭全屏放大
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          onWheel={handleWheel}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-8 cursor-zoom-out select-none"
        >
          {/* 顶部中央悬浮控制工具栏 */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md font-sans"
          >
            {/* 缩小 */}
            <button
              onClick={handleZoomOut}
              disabled={zoomScale <= 0.6}
              className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="缩小 (滚轮向下)"
            >
              <ZoomOut size={16} />
            </button>

            {/* 缩放比例指示器 / 一键重置 */}
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-md text-[11px] font-mono text-cyan-400 font-semibold hover:bg-cyan-500/10 transition-colors cursor-pointer shrink-0"
              title="重置缩放 (100%)"
            >
              {Math.round(zoomScale * 100)}%
            </button>

            {/* 放大 */}
            <button
              onClick={handleZoomIn}
              disabled={zoomScale >= 3.5}
              className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="放大 (滚轮向上 / 双击图片)"
            >
              <ZoomIn size={16} />
            </button>

            <div className="w-px h-4 bg-slate-800 mx-1" />

            {/* 顺时针旋转 */}
            <button
              onClick={handleRotate}
              className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="旋转 90 度"
            >
              <RotateCw size={15} />
            </button>

            <div className="w-px h-4 bg-slate-800 mx-1" />

            {/* 关闭 */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer"
              title="关闭 (Esc)"
            >
              <X size={16} />
            </button>
          </div>

          {/* 放大核心大图容器 (支持 drag 自由拖拽平移) */}
          <motion.div
            drag={zoomScale > 1}
            dragConstraints={{ left: -1000, right: 1000, top: -800, bottom: 800 }}
            dragElastic={0.08}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => {
              if (zoomScale === 1.0) {
                setZoomScale(2.0)
              } else {
                handleResetZoom()
              }
            }}
            className={cn(
              "relative max-w-full max-h-full flex flex-col items-center justify-center select-none touch-none",
              zoomScale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            )}
          >
            <img
              src={src}
              alt={alt || "预览大图"}
              draggable={false}
              style={{
                transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
              }}
              className="max-w-[85vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-800/80 pointer-events-auto select-none"
            />
            {alt && (
              <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-sans text-slate-300 text-center max-w-xl truncate shadow-lg pointer-events-none">
                {alt}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
