export interface MockKnowledgeBase {
  id: string
  name: string
  description?: string
  projectCount?: number
}

export const MOCK_KNOWLEDGE_BASES: MockKnowledgeBase[] = [
  {
    id: "kb_default",
    name: "默认知识库",
    description: "未归纳分类项目的通用存储库",
    projectCount: 2,
  },
  {
    id: "kb_sys_01",
    name: "Linux 内核与系统底层知识库",
    description: "内核架构、系统调用与底层网络协议栈相关文档",
    projectCount: 4,
  },
  {
    id: "kb_ai_02",
    name: "AI 与 Graph RAG 知识库",
    description: "Graph RAG 检索引擎、LLM 智能体落地工程",
    projectCount: 6,
  },
  {
    id: "kb_fe_03",
    name: "Web 前端架构知识库",
    description: "TypeScript、React 高级模式与 UI 设计系统",
    projectCount: 3,
  },
]
