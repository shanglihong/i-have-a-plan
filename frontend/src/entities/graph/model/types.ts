export interface GraphNodeDO {
  id: string;
  name?: string;
  label?: string;
  group?: string;
  source_note_id?: string;
  is_falsified?: boolean;
}

export interface GraphEdgeDO {
  source: string;
  target: string;
  relation_type?: "ASSOCIATES" | "FALSIFIES";
}

export interface GraphData {
  nodes: GraphNodeDO[];
  edges: GraphEdgeDO[];
}

export interface GraphNodeVO extends GraphNodeDO {
  _ui_opacity?: number;
}

export interface GraphEdgeVO extends GraphEdgeDO {
  _ui_line_style?: "solid" | "dashed" | "wavy";
}

export interface PeekNodeResponse {
  node_id: string;
  type: string;
  content: string;
  source_anchor?: {
    project_id: string;
    page_or_chapter_id: string;
  };
}
