import { Project } from "../../../shared/types";

export const MOCK_PROJECTS_DATA: Project[] = [
  {
    id: "1",
    title: "深入理解 Linux 内核架构与网络协议栈",
    type: "READING",
    status: "ACTIVE",
    progress: 75,
    deadline: "2026-08-30",
    tags: ["内核", "C语言", "网络"],
    notes: 42,
    createdAt: "2026-07-01",
  },
  {
    id: "2",
    title: "Graph RAG 知识检索与引擎落地工程",
    type: "PLAN",
    status: "ACTIVE",
    progress: 40,
    deadline: "2026-09-15",
    tags: ["AI", "图数据库", "Python"],
    tasks: 12,
    createdAt: "2026-07-05",
  },
  {
    id: "3",
    title: "TypeScript & React 高级设计模式精读",
    type: "READING",
    status: "COMPLETED",
    progress: 100,
    deadline: "2026-07-10",
    tags: ["前端", "TS", "架构"],
    notes: 28,
    createdAt: "2026-06-15",
  },
  {
    id: "4",
    title: "ebpf 动态追踪与性能调优最佳实践",
    type: "PLAN",
    status: "SUSPENDED",
    progress: 15,
    deadline: "2026-10-01",
    tags: ["ebpf", "Linux", "性能"],
    tasks: 8,
    createdAt: "2026-07-08",
  },
];

export const MOCK_PROJECTS = MOCK_PROJECTS_DATA;

export const MOCK_READING_CHAPTERS = [
  { id: "ch1", label: "第1章：感知机与历史", level: 0, done: true },
  { id: "ch2", label: "第2章：多层网络", level: 0, done: true },
  { id: "ch3", label: "第3章：反向传播算法", level: 0, active: true },
  { id: "ch3-1", label: "3.1 链式法则推导", level: 1 },
  { id: "ch3-2", label: "3.2 梯度消失分析", level: 1 },
  { id: "ch3-3", label: "3.3 BatchNorm 缓解", level: 1 },
  { id: "ch4", label: "第4章：卷积神经网络 (CNN)", level: 0 },
  { id: "ch5", label: "第5章：注意力机制与 Transformer", level: 0 },
];

export const MOCK_READING_INITIAL_MESSAGES = [
  {
    role: "assistant" as const,
    content:
      "你好！我已深度解析《第3章 · 反向传播算法》。关于**链式法则**推导或**梯度消失**机制，你有任何疑问可以随时提问或通过划词讨论哦！",
    done: true,
    quote: null as string | null,
  },
];

export const MOCK_READING_NOTES_FALLBACK = [
  {
    id: "demo-1",
    anchor: "3.2 梯度消失分析",
    quote: "当激活函数选用 Sigmoid 时，其导数的最大值仅为 0.25",
    content:
      "Sigmoid 在多层乘积后梯度迅速衰减至零，建议后续尝试 ReLU 或 BatchNorm 机制。",
    createdAt: "10:42",
  },
  {
    id: "demo-2",
    anchor: "3.1 链式法则推导",
    quote: "L = f(g(h(x)))",
    content:
      "复合导数连乘是反向传播求导的核心机制，理解导数流动方向是关键。",
    createdAt: "11:15",
  },
];

export const MOCK_READING_AI_REPLY =
  "这是一个非常具有代表性的问题。**反向传播算法**的核心是依据微积分中的**链式求导法则**，将输出层计算得到的损失误差信号沿网络相反方向逐层传递。" +
  "\n\n在每一层中，梯度等于局部导数与上层梯度的乘积。当激活函数（如 Sigmoid）的导数处于 (0, 0.25) 区间时，连续多层连乘会导致梯度呈指数级衰减，这就是**梯度消失**现象。";
