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
      className="my-6 rounded-xl border border-slate-800 bg-[#0A101D]/90 p-4 shadow-xl transition-all duration-200 hover:border-slate-700/80 font-sans"
    >
      {/* 代码块 Header */}
      <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Code2 size={15} className="text-cyan-400" />
          <span className="font-mono text-xs font-semibold text-slate-300">代码 / 数学公式切片</span>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer active:scale-95 font-sans"
          title="复制真实代码内容"
        >
          {copied || copiedCode ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400">已复制</span>
            </>
          ) : (
            <>
              <Copy size={13} className="text-slate-400" />
              <span>复制代码</span>
            </>
          )}
        </button>
      </div>

      {/* 代码/公式内容面板与 <pre> <code> 格式化控制 */}
      <div
        className="font-mono text-xs sm:text-sm leading-relaxed text-cyan-300 overflow-x-auto rounded-lg bg-slate-950/90 p-3.5 border border-slate-800/80 shadow-inner
          [&_pre]:m-0 [&_pre]:p-0 [&_pre]:bg-transparent [&_pre]:border-none [&_pre]:overflow-x-auto [&_pre]:font-mono
          [&_code]:font-mono [&_code]:text-cyan-300 [&_code]:leading-relaxed [&_code]:bg-transparent
          [&_pre_code]:block [&_pre_code]:whitespace-pre"
      >
        {hasPreCodeTag ? (
          <div dangerouslySetInnerHTML={{ __html: rawContent }} />
        ) : (
          <pre className="m-0 p-0 font-mono text-cyan-300 whitespace-pre overflow-x-auto">
            <code>{rawContent}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
