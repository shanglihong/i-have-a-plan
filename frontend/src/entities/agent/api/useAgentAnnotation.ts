import { useMutation, useQuery } from "@tanstack/react-query";
import { AIAnnotateRequestDTO, AIAnnotateResponseDTO } from "../model/types";

export const AGENT_ANNOTATION_QUERY_KEYS = {
  all: ["agent-annotations"] as const,
  chapter: (bookId: string, chapterId: string) =>
    [...AGENT_ANNOTATION_QUERY_KEYS.all, bookId, chapterId] as const,
};

// 自动根据 chapter_id 查询当前章节已有的 AI 标注数据（先使用 Mock）
export function useChapterAnnotationQuery(bookId?: string, chapterId?: string) {
  return useQuery<AIAnnotateResponseDTO>({
    queryKey: AGENT_ANNOTATION_QUERY_KEYS.chapter(bookId || "", chapterId || ""),
    queryFn: async () => {
      if (!bookId || !chapterId) {
        return { chapter_id: "", annotations: [] };
      }

      // 模拟后端根据 chapter_id 查询已存标注
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 假设特定章节 ID （如包含 "default"、"chap-1" 或常规默认章）已有预生成好的标注，其余章节初次获取不到返回 []
      const hasPreGenerated =
        chapterId.includes("chap-1") ||
        chapterId.includes("default") ||
        chapterId === "1" ||
        chapterId.length > 0; // 为了演示流畅，有 chapterId 时返回默认标注

      if (hasPreGenerated) {
        return {
          chapter_id: chapterId,
          annotations: [
            {
              text: "土字的基本意义是指泥土",
              category: "concept",
              explanation: "费孝通立足第一性原理，阐明乡土社会之‘土’根植于泥土与农业谋生方式。",
            },
            {
              text: "他们才是中国社会的基层",
              category: "conclusion",
              explanation: "强调靠土地谋生的基层农民构成了传统中国社会结构的决定性基石。",
            },
            {
              text: "世代定居是常态，迁移是变态",
              category: "conclusion",
              explanation: "总结农业人口与土地的高度绑定性及空间流动率极低的物理定律。",
            },
            {
              text: "生于斯、死于斯的社会",
              category: "conclusion",
              explanation: "定义乡土社会在地方性限制下的终老定居形态。",
            },
            {
              text: "以现在的情形来说，这片大陆上最大多数的人是拖泥带水下田讨生活的了",
              category: "quote",
              explanation: "生动描绘远东大陆上广大农民直接向土地汲取生存资源的劳动写照。",
            },
            {
              text: "你们中原去的人，到了这最适宜于放牧的草原，依旧锄地播种，一家家划着小小的一方地，种植起来；真象是向土里一钻，看不到其他利用这片地的方法了。我记得我的老师史禄国先生也告诉过我，远在西伯利亚，中国人住下了，不管天气如何，还是要下些种子，试试看能不能种地",
              category: "quote",
              explanation: "阐释乡土社会信任关系的真正来源：并非契约法理，而是习惯与规矩。",
            },
            {
              text: "从基层上看去，中国社会是乡土性的",
              category: "contrast",
              explanation: "区分 Tönnies 提出的 Gemeinschaft（熟人礼俗社会）与 Gesellschaft（陌生人法理社会）。",
            },
          ],
        };
      }

      return { chapter_id: chapterId, annotations: [] };
    },
    enabled: Boolean(bookId && chapterId),
  });
}

// 手动触发 AI 智能分析标注 API (生成标注)
export function useAIAnnotateMutation() {
  return useMutation<AIAnnotateResponseDTO, Error, AIAnnotateRequestDTO>({
    mutationFn: async (req: AIAnnotateRequestDTO) => {
      // 模拟 800ms 的后端 AI LLM 大模型提取推理延迟
      await new Promise((resolve) => setTimeout(resolve, 800));

      return {
        chapter_id: req.chapter_id,
        annotations: [
          {
            text: "土字的基本意义是指泥土",
            category: "concept",
            explanation: "【核心概念】费孝通立足第一性原理，阐明乡土社会之‘土’根植于泥土与农业谋生方式。",
          },
          {
            text: "熟悉",
            category: "concept",
            explanation: "【核心概念】乡土社会中人际关系的核心纽带，缺乏陌生人环境下的心理信任机制。",
          },
          {
            text: "他们才是中国社会的基层",
            category: "conclusion",
            explanation: "【关键结论】强调靠土地谋生的基层农民构成了传统中国社会结构的决定性基石。",
          },
          {
            text: "世代定居是常态，迁移是变态",
            category: "conclusion",
            explanation: "【关键结论】总结农业人口与土地的高度绑定性及空间流动率极低的物理定律。",
          },
          {
            text: "生于斯、死于斯的社会",
            category: "conclusion",
            explanation: "【关键结论】定义乡土社会在地方性限制下的终老定居形态。",
          },
          {
            text: "拖泥带水下田讨生活的了",
            category: "quote",
            explanation: "【经典金句】生动描绘远东大陆上广大农民直接向土地汲取生存资源的劳动写照。",
          },
          {
            text: "乡土社会里从熟悉得到信任",
            category: "quote",
            explanation: "【经典金句】阐释乡土社会信任关系的真正来源：并非契约法理，而是习惯与规矩。",
          },
          {
            text: "前者是礼俗社会，后者是法理社会",
            category: "contrast",
            explanation: "【概念对比】区分 Tönnies 提出的 Gemeinschaft（熟人礼俗社会）与 Gesellschaft（陌生人法理社会）。",
          },
        ],
      };
    },
  });
}
