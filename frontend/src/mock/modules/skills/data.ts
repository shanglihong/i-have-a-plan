export const MOCK_ACTIVE_SKILLS = [
  {
    id: "skill_01",
    title: "Graph RAG 知识检索系统架构",
    nodesCount: 9,
    status: "DEPLOYED",
    sandboxUrl: "/skills/sandbox/skill-1",
  },
  {
    id: "skill_02",
    title: "Linux 内核模块调试 Skill",
    nodesCount: 14,
    status: "IN_PROGRESS",
    graphUrl: "/graph",
  },
];

export const MOCK_PRESET_SKILLS = [
  { id: "skill_01", title: "Linux 内核模块分析与调试", category: "系统底层", nodesCount: 14 },
  { id: "skill_02", title: "Graph RAG 知识检索系统架构", category: "AI 与图工程", nodesCount: 9 },
  { id: "skill_03", title: "TypeScript & React 高级模式", category: "前端体系", nodesCount: 12 },
];

export const MOCK_SANDBOX_NODES = [
  {
    id: "s1",
    title: "收集相关文献",
    desc: "系统性检索",
    status: "COMPLETED",
    x: 60,
    y: 120,
    deps: [],
  },
  {
    id: "s2",
    title: "提炼核心概念",
    desc: "语义聚类分析",
    status: "ACTIVE",
    x: 280,
    y: 80,
    deps: ["s1"],
  },
  {
    id: "s3",
    title: "构建知识框架",
    desc: "拓扑结构建模",
    status: "ACTIVE",
    x: 280,
    y: 200,
    deps: ["s1"],
  },
  {
    id: "s4",
    title: "验证一致性",
    desc: "逻辑一致性检验",
    status: "PENDING",
    x: 500,
    y: 140,
    deps: ["s2", "s3"],
  },
  {
    id: "s5",
    title: "生成技能卡片",
    desc: "结构化输出",
    status: "PENDING",
    x: 700,
    y: 140,
    deps: ["s4"],
  },
];

