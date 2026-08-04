import { RefObject } from "react"
import { Check, Copy, Lightbulb } from "lucide-react"
import { ReadingSelectionToolbar } from "./ReadingSelectionToolbar"
import { cn } from "../../shared/utils/cn"

interface ReadingArticleViewerProps {
  readerRef: RefObject<HTMLDivElement | null>
  targetAnchor: string | null
  copiedCode: boolean
  onTextSelect: () => void
  onScroll: () => void
  onCopyFormulaCode: (code: string) => void
  onDiscussSelection: (text: string) => void
  onCreateNoteFromSelection: (text: string) => void
  onExtractSkill: (scopeType: "L1" | "L2", text?: string) => void
}

export function ReadingArticleViewer({
  readerRef,
  targetAnchor,
  copiedCode,
  onTextSelect,
  onScroll,
  onCopyFormulaCode,
  onDiscussSelection,
  onCreateNoteFromSelection,
  onExtractSkill,
}: ReadingArticleViewerProps) {
  return (
    <div
      ref={readerRef}
      className="flex-1 overflow-y-auto px-4 sm:px-6 2xl:px-12 py-6 2xl:py-10 relative scrollbar-thin scrollbar-thumb-slate-800"
      onMouseUp={onTextSelect}
      onScroll={onScroll}
    >
      {/* Floating Text Selection Menu Toolbar */}
      <ReadingSelectionToolbar
        onDiscuss={onDiscussSelection}
        onCreateNote={onCreateNoteFromSelection}
        onExtractSkill={(scopeType, text) => onExtractSkill(scopeType, text)}
      />

      {/* Main Article Body */}
      <article className="max-w-[720px] mx-auto text-slate-200 leading-relaxed font-sans">
        {/* Document Header */}
        <div className="mb-8 pb-4 border-b border-slate-800/80">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            Core Theory Reading · Chapter 3
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2 mb-3 tracking-tight">
            第三章：反向传播算法及其微积分推导
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            发布时间：2026-07-19 · 阅读难度：高级 · 考点：链式法则、梯度衰减
          </p>
        </div>

        {/* Paragraph 1 */}
        <p className="text-base leading-[1.8] text-slate-300 mb-6">
          反向传播（Backpropagation）是训练人工神经网络的核心算法，由 Rumelhart、Hinton 和 Williams 于 1986 年系统性地提出。其本质在于借助微积分中的
          <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 mx-1 rounded font-medium">
            链式求导法则 (Chain Rule)
          </span>
          ，高效且精准地计算损失函数关于神经网络中每一个可修学习参数的偏导数。
        </p>

        {/* Section 3.1 */}
        <h2 className="text-lg font-bold text-slate-100 mb-3 mt-8 flex items-center gap-2">
          <span className="text-cyan-400 font-mono">3.1</span> 链式法则的核心微积分推导
        </h2>
        <p className="text-base leading-[1.8] text-slate-300 mb-6">
          设一个典型的多层前馈神经网络可以抽象为复合函数{" "}
          <code className="text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">
            L = f(g(h(x)))
          </code>
          ，根据多元微积分法则，目标损失 L 关于最内层输入变量 x 的梯度等于各个局部梯度的连乘：
        </p>

        {/* Math Formula Card Block */}
        <div className="my-6 p-4 bg-[#0F172A]/80 border border-slate-800 rounded-xl relative group shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-slate-400 font-medium">
              链式求导公式 (Chain Rule Expression)
            </span>
            <button
              onClick={() =>
                onCopyFormulaCode(
                  "∂L/∂x = (∂L/∂f) · (∂f/∂g) · (∂g/∂h) · (∂h/∂x)"
                )
              }
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="复制公式"
            >
              {copiedCode ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
          <div className="font-mono text-sm text-cyan-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 overflow-x-auto text-center font-semibold tracking-wide">
            ∂L / ∂x = (∂L / ∂f) · (∂f / ∂g) · (∂g / ∂h) · (∂h / ∂x)
          </div>
        </div>

        {/* Section 3.2 */}
        <h2 className="text-lg font-bold text-slate-100 mb-3 mt-8 flex items-center gap-2">
          <span className="text-cyan-400 font-mono">3.2</span> 梯度消失现象与定量分析
        </h2>

        {/* Paragraph Callout Box */}
        <div
          className={cn(
            "my-6 p-4 rounded-xl border transition-all duration-700",
            targetAnchor?.includes("梯度消失") || targetAnchor?.includes("3.2")
              ? "ring-2 ring-cyan-400 bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
              : "bg-slate-900/60 border-slate-800"
          )}
        >
          <div className="flex items-start gap-3">
            <Lightbulb size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-200 mb-1">
                重点避坑：梯度消失 (Vanishing Gradient Problem)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                当传统激活函数选用 Sigmoid 时，其导数区间仅为 <code className="text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded font-mono">(0, 0.25]</code>。在多层神经网络中，当层数超出 5 层以上时，首尾梯度相乘将导致信号呈指数级收缩至零。
              </p>
            </div>
          </div>
        </div>

        <p className="text-base leading-[1.8] text-slate-300 mb-6">
          假设每层 Sigmoid 激活函数的局部导数均取最大值 0.25，对于一个 10 层的深层网络，第 1 层接收到的残差更新信号强度仅为：
        </p>

        <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-300 mb-6 text-center">
          0.25¹⁰ ≈ 9.5367 × 10⁻⁷ (浅层参数近乎停滞更新)
        </div>

        {/* Section 3.3 */}
        <h2 className="text-lg font-bold text-slate-100 mb-3 mt-8 flex items-center gap-2">
          <span className="text-cyan-400 font-mono">3.3</span> Batch Normalization 与 ResNet 现代解法
        </h2>
        <p className="text-base leading-[1.8] text-slate-300 mb-6">
          批量归一化（Batch Normalization）通过将每一隐藏层的输入分布强制拉回到均值为 0、方差为 1 的标准正态分布区间，从而完美避开了 Sigmoid 的两端饱和区。配合
          <span className="text-cyan-300 font-medium mx-1">ReLU (Rectified Linear Unit)</span>
          以及 ResNet 残差连接，现代深度模型已成功支撑上千层网络的稳定收敛。
        </p>

        <div className="h-16" />
      </article>
    </div>
  )
}
