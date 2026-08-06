import { useState } from "react"
import { Image as ImageIcon, ImageOff } from "lucide-react"
import { ContentBlockDO } from "../../../../../entities"
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

  const { src: rawSrc, alt } = extractImageSrcAndAlt(block.html_or_markdown || "", block.text || "")
  const finalSrc = getImageUrl(rawSrc, bookId)

  return (
    <div
      key={block.block_id || index}
      id={block.block_id}
      data-block-id={block.block_id}
      data-block-index={index}
      className="my-6 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center justify-center relative overflow-hidden shadow-lg group font-sans"
    >
      {finalSrc && !hasError ? (
        <div className="relative flex flex-col items-center justify-center max-w-full">
          {isLoading && (
            <div className="w-64 h-48 rounded-xl bg-slate-800/60 animate-pulse flex flex-col items-center justify-center gap-2 text-slate-400 font-sans">
              <ImageIcon size={28} className="animate-bounce text-cyan-400/70" />
              <span className="text-xs font-mono">载入图片资源中...</span>
            </div>
          )}
          <img
            src={finalSrc}
            alt={alt}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
            }}
            className={cn(
              "max-w-full h-auto rounded-xl shadow-md transition-all duration-300 group-hover:scale-[1.01]",
              isLoading ? "hidden" : "block"
            )}
          />
          {alt && !isLoading && (
            <span className="mt-2.5 text-xs font-sans text-slate-400 italic text-center block">
              {alt}
            </span>
          )}
        </div>
      ) : (
        <div className="py-8 px-6 flex flex-col items-center justify-center gap-2 text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800/80 w-full font-sans">
          <ImageOff size={24} className="text-slate-600" />
          <span className="text-xs font-mono text-slate-400">{alt || "未找到图片资源"}</span>
          {rawSrc && <span className="text-[10px] font-mono text-slate-600">{rawSrc}</span>}
        </div>
      )}
    </div>
  )
}
