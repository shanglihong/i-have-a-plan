import { useState, useEffect } from "react"
import {
  type TextAnnotation,
  type ContentBlockDO,
  useAIAnnotateMutation,
  useChapterAnnotationQuery,
} from "../../../../entities"

// 第一章 AI 标注 Mock 数据定义 (包含核心概念、总结结论、经典引文、概念对比全系类型)
const FIRST_CHAPTER_MOCK_ANNOTATIONS: TextAnnotation[] = [
  {
    text: "中国社会的基层是乡土性的",
    category: "concept",
    explanation: "核心概念：定义了中国传统社会结构的基础特征与基调",
  },
  {
    text: "土头的",
    category: "quote",
    explanation: "经典引文：指代离不开泥土、靠农业谋生的乡土人群",
  },
  {
    text: "他们才是中国社会的基层",
    category: "conclusion",
    explanation: "关键结论：指出广大乡村人群构成中国社会的核心主体",
  },
  {
    text: "土字的基本意义是指泥土",
    category: "contrast",
    explanation: "概念对比：对比了字面含义与社会学延伸内涵的关联",
  },
]

interface UseReadingAnnotationsParams {
  bookId?: string
  chapterId?: string
  chapterTitle?: string
  blocks: ContentBlockDO[]
  onAIAnnotate?: () => void
}

export function useReadingAnnotations({
  bookId,
  chapterId,
  chapterTitle,
  blocks,
  onAIAnnotate,
}: UseReadingAnnotationsParams) {
  // 判断当前是否为第一章
  const isFirstChapter =
    !chapterId ||
    chapterId === "ch1" ||
    chapterId === "1" ||
    chapterId.includes("ch1") ||
    chapterTitle?.includes("第一") ||
    chapterTitle?.includes("乡土本色")

  // 1. 自动根据 chapter_id 查询已有的 AI 标注数据（通过 useChapterAnnotationQuery API）
  const { data: cachedAnnotationData } = useChapterAnnotationQuery(bookId, chapterId)

  // 2. 接入手动生成 AI 标注的 Mutation 钩子与本地覆盖状态
  const aiAnnotateMutation = useAIAnnotateMutation()
  const [userOverrideAnnotations, setUserOverrideAnnotations] = useState<TextAnnotation[] | null>(null)

  // 切换章节时自动清空本地覆盖标记
  useEffect(() => {
    setUserOverrideAnnotations(null)
  }, [chapterId])

  // 当前有效显示的标注：
  const activeAnnotations =
    userOverrideAnnotations !== null
      ? userOverrideAnnotations
      : cachedAnnotationData?.annotations && cachedAnnotationData.annotations.length > 0
        ? cachedAnnotationData.annotations
        : isFirstChapter
          ? FIRST_CHAPTER_MOCK_ANNOTATIONS
          : []

  const hasAnnotations = activeAnnotations.length > 0

  // 触发 AI 智能标注生成
  const handleAIAnnotate = () => {
    if (onAIAnnotate) {
      onAIAnnotate()
    }
    const fullContent = blocks.map((b) => b.text).join("\n\n") || "中国社会的基层是乡土性的..."

    aiAnnotateMutation.mutate(
      {
        book_id: bookId,
        chapter_id: chapterId,
        content: fullContent,
      },
      {
        onSuccess: (data: { annotations?: TextAnnotation[] }) => {
          setUserOverrideAnnotations(data.annotations || [])
        },
      }
    )
  }

  // 清除标注（供按钮或辅助清理使用）
  const handleClearAnnotations = () => {
    setUserOverrideAnnotations([])
  }

  return {
    activeAnnotations,
    hasAnnotations,
    handleAIAnnotate,
    handleClearAnnotations,
    isPending: aiAnnotateMutation.isPending,
  }
}
