import { motion, AnimatePresence } from "framer-motion"
import { Sparkles } from "lucide-react"

interface ReadingFeedbackToastProps {
  message: string | null
}

export function ReadingFeedbackToast({ message }: ReadingFeedbackToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-violet-950/90 border border-violet-500/50 text-violet-200 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2"
        >
          <Sparkles size={14} className="text-violet-400" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
