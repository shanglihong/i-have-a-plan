import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, MessageSquare, X, ArrowRight } from "lucide-react"
import { READING_TOKENS } from "../../../shared/constants/tokens"

interface RecommendationBubbleProps {
  isVisible: boolean
  onClose: () => void
  onGenerateSkill: () => void
  onStartDiscuss: () => void
  chapterTitle?: string
  isLaptopOrSmaller?: boolean
}

export function RecommendationBubble({
  isVisible,
  onClose,
  onGenerateSkill,
  onStartDiscuss,
  chapterTitle = "当前章节",
  isLaptopOrSmaller = false,
}: RecommendationBubbleProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 p-3.5 sm:p-4.5 ${READING_TOKENS.surface.recommendationBubble} ${
            isLaptopOrSmaller
              ? "w-[300px] sm:w-[340px] max-w-[calc(100%-2rem)]"
              : "w-[320px] sm:w-[380px] max-w-[calc(100%-2rem)]"
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Glowing Icon Container with Pulse */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-inner">
                <Sparkles size={16} />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400" />
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h5 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 tracking-tight shrink-0 whitespace-nowrap">
                  <span>AI 导师启发引导</span>
                </h5>
                <span className={READING_TOKENS.surface.anchorBadge}>
                  章节末 5% 推荐
                </span>
              </div>

              <p className={`${READING_TOKENS.typography.subtext} text-xs leading-relaxed mb-3 break-words`}>
                检测到您即将读完 <span className="text-cyan-300 font-semibold">{chapterTitle}</span>。导师已为您提炼了 3 个核心方法论与避坑卡片。
              </p>

              {/* Action CTA Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onGenerateSkill}
                  className={READING_TOKENS.surface.recommendationAction}
                >
                  <span className="whitespace-nowrap">提炼技能卡片</span>
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>

                <button
                  onClick={onStartDiscuss}
                  className={`${READING_TOKENS.typography.action} shrink-0 whitespace-nowrap px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 hover:text-slate-100`}
                  title="向 AI 伴读提问"
                >
                  <MessageSquare size={13} className="text-cyan-400 shrink-0" />
                  <span className="whitespace-nowrap">伴读</span>
                </button>
              </div>
            </div>

            {/* Dismiss Close Button */}
            <button
              onClick={onClose}
              aria-label="关闭推荐"
              className="text-slate-400 hover:text-slate-100 shrink-0 cursor-pointer p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
