import { useState } from "react"
import { Check, Copy, Code2 } from "lucide-react"
import { ContentBlockDO } from "../../../../../entities"

interface CodeBlockProps {
  block: ContentBlockDO
  index: number
  copiedCode: boolean
  onCopyFormulaCode: (code: string) => void
}

/**
 * 提取干净的代码文本（用于一键复制，自动剥离 <pre><code> 标签或 Markdown 包裹符）
 */
function extractPureCodeText(raw: string): string {
  if (!raw) return ""
  if (/<(pre|code)[\s\S]*?>/i.test(raw)) {
    const doc = new DOMParser().parseFromString(raw, "text/html")
    return doc.body.textContent || raw
  }
  return raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()
}

export function CodeBlock({ block, index, copiedCode, onCopyFormulaCode }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const rawContent = block.html_or_markdown || block.text || ""
  const codeToCopy = extractPureCodeText(rawContent)

  const handleCopy = () => {
    onCopyFormulaCode(codeToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 判断是否包含 <pre> 或 <code> 标签
  const hasPreCodeTag = /<(pre|code)[\s\S]*?>/i.test(rawContent)

  return (
    <div
      key={block.block_id || index}
      id={block.block_id}
      data-block-id={block.block_id}
      data-block-index={index}
      className="group relative my-4 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 sm:p-4 transition-all duration-300 hover:border-slate-700/60"
    >
      {/* 顶部浮动复制按钮 */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/80 px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all cursor-pointer active:scale-95 shadow-sm"
          title="复制代码内容"
        >
          {copied || copiedCode ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400 font-mono">已复制</span>
            </>
          ) : (
            <>
              <Copy size={12} className="text-slate-400" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>

      {/* 简洁类型指示器 */}
      <div className="mb-2 flex items-center gap-1.5 select-none">
        <Code2 size={13} className="text-cyan-400/70" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 font-medium">Code</span>
      </div>

      {/* 代码与公式内容 */}
      <div
        className="font-mono text-xs sm:text-sm leading-relaxed text-cyan-300/90 overflow-x-auto selection:bg-cyan-500/30 pr-12
          [&_pre]:m-0 [&_pre]:p-0 [&_pre]:bg-transparent [&_pre]:border-none [&_pre]:overflow-x-auto [&_pre]:font-mono
          [&_code]:font-mono [&_code]:text-cyan-300/90 [&_code]:leading-relaxed [&_code]:bg-transparent
          [&_pre_code]:block [&_pre_code]:whitespace-pre"
      >
        {hasPreCodeTag ? (
          <div dangerouslySetInnerHTML={{ __html: rawContent }} />
        ) : (
          <pre className="m-0 p-0 font-mono text-cyan-300/90 whitespace-pre overflow-x-auto">
            <code>{rawContent}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
