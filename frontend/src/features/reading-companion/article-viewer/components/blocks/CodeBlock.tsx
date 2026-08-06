import React, { useState } from "react"
import { Check, Copy, Code2 } from "lucide-react"
import { ContentBlockDO } from "../../../../../entities"

interface CodeBlockProps {
  block: ContentBlockDO
  index: number
  copiedCode: boolean
  onCopyFormulaCode: (code: string) => void
}

/**
 * 提取干净的代码文本（用于一键复制与语法高亮，自动剥离 <pre><code> 标签或 Markdown 包裹符）
 */
function extractPureCodeText(raw: string): string {
  if (!raw) return ""
  if (/<(pre|code)[\s\S]*?>/i.test(raw)) {
    const doc = new DOMParser().parseFromString(raw, "text/html")
    return doc.body.textContent || raw
  }
  return raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()
}

/**
 * 提取/判定代码语言类型
 */
function detectLanguage(raw: string): string {
  if (!raw) return "CODE"
  const langMatch = raw.match(/```([a-zA-Z0-9_-]+)/) || raw.match(/class=["'].*?lang(?:uage)?-([a-zA-Z0-9_-]+)/i)
  if (langMatch && langMatch[1]) {
    return langMatch[1].toUpperCase()
  }
  if (/^\s*(import|from|def|class|if __name__ ==)\b/m.test(raw)) return "PYTHON"
  if (/^\s*(import|const|let|var|function|export default|interface)\b/m.test(raw)) return "JAVASCRIPT"
  if (/^\s*<[!a-zA-Z]/m.test(raw)) return "HTML"
  if (/^\s*[\{\}\.]/m.test(raw) && raw.includes(":")) return "CSS/JSON"
  return "CODE"
}

/**
 * 基于词法 Tokenizer 的高级代码语法高亮变色组件
 */
function HighlightedCode({ code }: { code: string }) {
  if (!code) return null

  // 正则按优先级切分词法 Token：注释、字符串、关键字、布尔/空值、数字、函数名、类型/类名
  const tokenRegex =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`)|(\b(?:const|let|var|function|return|if|else|for|while|import|export|from|async|await|class|def|public|private|protected|static|new|try|catch|finally|throw|raise|self|this|typeof|instanceof|interface|type|struct|enum|in|is|yield|lambda|val|match|case|break|continue|pass)\b)|(\b(?:true|false|null|undefined|None|True|False|nil)\b)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_$][A-Za-z0-9_$]*(?=\s*\())|(\b[A-Z][A-Za-z0-9_$]*\b)/g

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let count = 0

  while ((match = tokenRegex.exec(code)) !== null && count < 3000) {
    count++
    const matchStart = match.index
    const matchText = match[0]

    if (matchStart > lastIndex) {
      nodes.push(code.substring(lastIndex, matchStart))
    }

    const [_, comment, stringLiteral, keyword, booleanOrNull, number, functionCall, typeName] = match

    if (comment) {
      nodes.push(
        <span key={matchStart} className="text-slate-500 italic select-none">
          {matchText}
        </span>
      )
    } else if (stringLiteral) {
      nodes.push(
        <span key={matchStart} className="text-emerald-300">
          {matchText}
        </span>
      )
    } else if (keyword) {
      nodes.push(
        <span key={matchStart} className="text-purple-400 font-medium">
          {matchText}
        </span>
      )
    } else if (booleanOrNull) {
      nodes.push(
        <span key={matchStart} className="text-amber-400 font-medium">
          {matchText}
        </span>
      )
    } else if (number) {
      nodes.push(
        <span key={matchStart} className="text-amber-300">
          {matchText}
        </span>
      )
    } else if (functionCall) {
      nodes.push(
        <span key={matchStart} className="text-sky-300">
          {matchText}
        </span>
      )
    } else if (typeName) {
      nodes.push(
        <span key={matchStart} className="text-teal-300 font-medium">
          {matchText}
        </span>
      )
    } else {
      nodes.push(matchText)
    }

    lastIndex = matchStart + matchText.length
  }

  if (lastIndex < code.length) {
    nodes.push(code.substring(lastIndex))
  }

  return <>{nodes}</>
}

export function CodeBlock({ block, index, copiedCode, onCopyFormulaCode }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const rawContent = block.html_or_markdown || block.text || ""
  const codeToCopy = extractPureCodeText(rawContent)
  const language = detectLanguage(rawContent)

  const handleCopy = () => {
    onCopyFormulaCode(codeToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      key={block.block_id || index}
      id={block.block_id}
      data-block-id={block.block_id}
      data-block-index={index}
      className="group relative my-4 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3.5 sm:p-4 transition-all duration-300 hover:border-slate-700/60 shadow-md"
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

      {/* 简洁类型与语言指示器 */}
      <div className="mb-2.5 flex items-center gap-1.5 select-none">
        <Code2 size={13} className="text-cyan-400/70" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
          {language}
        </span>
      </div>

      {/* 变色高亮代码内容 */}
      <div className="font-mono text-xs sm:text-sm leading-relaxed text-cyan-100/90 overflow-x-auto selection:bg-cyan-500/30 pr-12">
        <pre className="m-0 p-0 font-mono whitespace-pre overflow-x-auto bg-transparent border-none">
          <code>
            <HighlightedCode code={codeToCopy} />
          </code>
        </pre>
      </div>
    </div>
  )
}

