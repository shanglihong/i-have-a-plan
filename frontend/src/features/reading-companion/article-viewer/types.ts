import { RefObject } from "react"

export interface ReadingArticleViewerProps {
  projectId: string
  readerRef: RefObject<HTMLDivElement | null>
  bookId?: string
  chapterId?: string
  chapterTitle?: string
  targetAnchor: string | null
  copiedCode: boolean
  onTextSelect: () => void
  onScroll: () => void
  onCopyFormulaCode: (code: string) => void
  onDiscussSelection: (text: string) => void
  onCreateNoteFromSelection: (
    text: string,
    interpretation?: string,
    offsets?: {
      startOffset?: number
      endOffset?: number
      chapter_startOffset?: number
      chapter_endOffset?: number
    }
  ) => void
  onExtractSkill: (scopeType: "L1" | "L2", text?: string) => void
  onAIAnnotate?: () => void
}

export interface RawMatch {
  start: number
  end: number
  text: string
  category: string
  explanation?: string
}

export interface CombinedMatch {
  start: number
  end: number
  text: string
  userNote?: RawMatch
  tempSelection?: RawMatch
  aiAnnotations: RawMatch[]
}

export type BlockType = "heading" | "code" | "callout" | "paragraph" | string
