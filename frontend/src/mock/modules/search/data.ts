import type { SearchResultItem } from '../../../entities/search'

export const mockSearchDatabase: SearchResultItem[] = [
  {
    id: 'proj-1',
    type: 'project',
    title: '深度学习论文研读与知识体系构建',
    snippet: '针对经典 AI 论文（Transformer, Diffusion, Graph RAG）进行精读与图谱关系梳理。',
    target_url: '/projects/proj-1',
    updated_at: '2026-07-18T10:00:00Z',
  },
  {
    id: 'proj-2',
    type: 'project',
    title: 'Linux 内核驱动开发与实战研读',
    snippet: '聚焦内存管理、中断处理与字符设备驱动架构演进与实践。',
    target_url: '/projects/proj-2',
    updated_at: '2026-07-17T14:30:00Z',
  },
  {
    id: 'note-101',
    type: 'note',
    title: 'BP 反向传播算法与梯度下降推导细节',
    snippet: '多层前馈神经网络的链式法则求导， Sigmoid 激活函数的梯度消失分析。',
    target_url: '/reading?projectId=proj-1&noteId=note-101',
    updated_at: '2026-07-19T08:30:00Z',
  },
  {
    id: 'note-102',
    type: 'note',
    title: 'Graph RAG 拓扑社区发现算法笔记',
    snippet: '通过 Leidain 社区发现算法对实体关系图谱建构层次化摘要，提升复杂问答召回。',
    target_url: '/reading?projectId=proj-1&noteId=note-102',
    updated_at: '2026-07-19T09:15:00Z',
  },
  {
    id: 'node-201',
    type: 'graph',
    title: '图神经网络 (GNN) 实体概念',
    snippet: '知识图谱核心节点 - 消息传递机制 (Message Passing) 与邻域聚合。',
    target_url: '/graph?nodeId=node-201',
    updated_at: '2026-07-16T11:20:00Z',
  },
  {
    id: 'node-202',
    type: 'graph',
    title: 'Transformer Self-Attention 注意力机制',
    snippet: '知识图谱核心节点 - Q/K/V 矩阵映射与多头注意力计算。',
    target_url: '/graph?nodeId=node-202',
    updated_at: '2026-07-15T16:40:00Z',
  },
  {
    id: 'skill-301',
    type: 'skill',
    title: 'Graph RAG 知识检索系统架构 Skill',
    snippet: '自动化提取论文核心结论并编译生成向量-图谱混合检索服务。',
    target_url: '/sandbox?skillId=skill-301',
    updated_at: '2026-07-18T16:00:00Z',
  },
  {
    id: 'skill-302',
    type: 'skill',
    title: 'Linux 字符设备驱动编译沙箱 Skill',
    snippet: '沙箱验证 Makefile 自动化构建与内核模块加载流程。',
    target_url: '/sandbox?skillId=skill-302',
    updated_at: '2026-07-14T09:00:00Z',
  },
]

export function searchMockData(query: string, category: string = 'all', limit: number = 10): SearchResultItem[] {
  if (!query.trim()) return []

  const q = query.toLowerCase()

  let list = mockSearchDatabase.filter((item) => {
    const matchCategory = category === 'all' || item.type === category
    const matchText = item.title.toLowerCase().includes(q) || item.snippet.toLowerCase().includes(q)
    return matchCategory && matchText
  })

  return list.slice(0, limit)
}
