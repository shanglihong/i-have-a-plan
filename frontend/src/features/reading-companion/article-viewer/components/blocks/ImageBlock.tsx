import { useState } from "react"
import { Image as ImageIcon, ImageOff, ZoomIn } from "lucide-react"
import { ContentBlockDO } from "../../../../../entities"
import { ImageLightboxModal } from "../../../../../shared/ui"
import { cn } from "../../../../../shared/utils/cn"

interface ImageBlockProps {
  block: ContentBlockDO
  index: number
  bookId?: string
}

/**
 * 从 html_or_markdown 或 text 中提取图片相对 src 与 alt 描述
 */
function extractImageSrcAndAlt(htmlOrMarkdown: string, fallbackText: string): { src: string; alt: string } {
  if (!htmlOrMarkdown) {
    return { src: fallbackText, alt: fallbackText.length < 60 ? fallbackText : "图片切片" }
  }

  const srcMatch = htmlOrMarkdown.match(/(?:src|href|xlink:href)=["']([^"']+)["']/i)
  const src = srcMatch ? srcMatch[1] : fallbackText

  const altMatch = htmlOrMarkdown.match(/alt=["']([^"']+)["']/i)
  const alt = altMatch ? altMatch[1] : fallbackText.length < 60 ? fallbackText : "图片切片"

  return { src, alt }
}

/**
 * 转换后端真实图片 REST API URL (/api/books/{book_id}/images/{image_name})
 */
function getImageUrl(src: string, bookId?: string): string {
  if (!src) return ""
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src
  }
  if (!bookId) return src

  const cleanPath = src.replace(/^(\.\/|\/)+/, "")
  return `/api/books/${bookId}/images/${encodeURIComponent(cleanPath)}`
}

export function ImageBlock({ block, index, bookId }: ImageBlockProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isZoomed, setIsZoomed] = useState(false)

  const { src: rawSrc, alt } = extractImageSrcAndAlt(block.html_or_markdown || "", block.text || "")
  const finalSrc = getImageUrl(rawSrc, bookId)

  return (
    <>
      <div
        key={block.block_id || index}
        id={block.block_id}
        data-block-id={block.block_id}
        data-block-index={index}
        className="my-4 p-1.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex flex-col items-center justify-center relative overflow-hidden shadow-xs group font-sans"
      >
        {finalSrc && !hasError ? (
          <div className="relative flex flex-col items-center justify-center max-w-full group">
            {isLoading && (
              <div className="w-64 h-48 rounded-lg bg-slate-800/50 animate-pulse flex flex-col items-center justify-center gap-2 text-slate-400 font-sans">
                <ImageIcon size={26} className="animate-bounce text-cyan-400/70" />
                <span className="text-xs font-mono">载入图片资源中...</span>
              </div>
            )}

            <div
              className="relative overflow-hidden rounded-lg cursor-zoom-in group/img"
              onClick={() => setIsZoomed(true)}
            >
              <img
                src={finalSrc}
                alt={alt}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false)
                  setHasError(true)
                }}
                className={cn(
                  "max-w-full h-auto rounded-lg shadow-xs transition-all duration-300 group-hover/img:scale-[1.01]",
                  isLoading ? "hidden" : "block"
                )}
              />
              {/* 悬浮放大微型提示角标 */}
              {!isLoading && (
                <div className="absolute top-2 right-2 p-1 px-2 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-slate-200 opacity-0 group-hover/img:opacity-100 transition-all shadow-md flex items-center gap-1 text-[10.5px] font-medium pointer-events-none">
                  <ZoomIn size={12} className="text-cyan-400" />
                  <span>点击放大</span>
                </div>
              )}
            </div>

            {alt && !isLoading && (
              <span className="mt-1.5 mb-0.5 text-[12px] font-sans text-slate-400/90 italic text-center block px-2">
                {alt}
              </span>
            )}
          </div>
        ) : (
          <div className="py-6 px-4 flex flex-col items-center justify-center gap-1.5 text-slate-500 bg-slate-950/30 rounded-lg border border-dashed border-slate-800/60 w-full font-sans">
            <ImageOff size={22} className="text-slate-600" />
            <span className="text-xs font-mono text-slate-400">{alt || "未找到图片资源"}</span>
            {rawSrc && <span className="text-[10px] font-mono text-slate-600">{rawSrc}</span>}
          </div>
        )}
      </div>

      {/* ── 引用通用 UI 组件: ImageLightboxModal ── */}
      <ImageLightboxModal
        isOpen={isZoomed}
        src={finalSrc}
        alt={alt}
        onClose={() => setIsZoomed(false)}
      />
    </>
  )
}
