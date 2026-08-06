import { CombinedMatch, RawMatch } from "../types"

/**
 * 基于 Slice Boundary Partitioning（切分切割点算法）合并重叠标注
 */
export const buildCombinedMatches = (fullText: string, rawMatches: RawMatch[]): CombinedMatch[] => {
  if (!fullText || rawMatches.length === 0) return []

  const pointsSet = new Set<number>()
  rawMatches.forEach((r) => {
    if (r.start >= 0 && r.end <= fullText.length && r.start < r.end) {
      pointsSet.add(r.start)
      pointsSet.add(r.end)
    }
  })

  const sortedPoints = Array.from(pointsSet).sort((a, b) => a - b)
  const combinedMatches: CombinedMatch[] = []

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const pStart = sortedPoints[i]
    const pEnd = sortedPoints[i + 1]

    const activeMatches = rawMatches.filter((r) => r.start <= pStart && r.end >= pEnd)
    if (activeMatches.length === 0) continue

    const userNote = activeMatches.find((r) => r.category === "user-note")
    const tempSelection = activeMatches.find((r) => r.category === "temp-selection")
    const aiAnnotations = activeMatches.filter((r) => r.category !== "user-note" && r.category !== "temp-selection")

    const prev = combinedMatches[combinedMatches.length - 1]
    const canMergeWithPrev =
      prev &&
      prev.end === pStart &&
      prev.userNote === userNote &&
      prev.tempSelection === tempSelection &&
      prev.aiAnnotations.length === aiAnnotations.length &&
      prev.aiAnnotations.every((ai, idx) => ai === aiAnnotations[idx])

    if (canMergeWithPrev) {
      prev.end = pEnd
      prev.text = fullText.substring(prev.start, prev.end)
    } else {
      combinedMatches.push({
        start: pStart,
        end: pEnd,
        text: fullText.substring(pStart, pEnd),
        userNote,
        tempSelection,
        aiAnnotations,
      })
    }
  }

  return combinedMatches
}
