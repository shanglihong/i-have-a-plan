export interface DashboardStatsResponse {
  active_projects: { value: number; badge: string; desc: string };
  total_notes: { value: number; badge: string; desc: string };
  extracted_skills: { value: number; badge: string; desc: string };
  graph_nodes: { value: number; badge: string; desc: string };
}

export const MOCK_DASHBOARD_STATS: DashboardStatsResponse = {
  active_projects: {
    value: 4,
    badge: "本周 +2",
    desc: "2 个关键里程碑推进中",
  },
  total_notes: {
    value: 119,
    badge: "精读 12 篇",
    desc: "已锚定 380+ 选区切片",
  },
  extracted_skills: {
    value: 8,
    badge: "已同步沙箱",
    desc: "关联 5 个核心领域节点",
  },
  graph_nodes: {
    value: 236,
    badge: "1 依赖关注",
    desc: "图谱依赖关系拓扑已更新",
  },
};
