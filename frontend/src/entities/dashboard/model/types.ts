export interface StatItemVO {
  value: number;
  badge: string;
  desc: string;
}

export interface DashboardStatsDO {
  active_projects: StatItemVO;
  total_notes: StatItemVO;
  extracted_skills: StatItemVO;
  graph_nodes: StatItemVO;
}
