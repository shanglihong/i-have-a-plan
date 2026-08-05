export interface SourceAnchor {
  page_or_chapter_id: string;
  start_offset?: number;
  end_offset?: number;
  feature_text?: string;
  project_id?: string;
}

export interface UnifiedReadingNoteDO {
  id: string;
  project_id: string;
  projectId?: string;
  project_name?: string;
  content: string;
  quote?: string;
  anchor?: string;
  createdAt: string;
  tags?: string[];
  source_anchor?: SourceAnchor;
}


export interface MaterialSourceAnchor {
  book_id: string;
  chapter_id: string;
  start_offset: number;
  end_offset: number;
  feature_text: string;
}

export interface CreateMaterialNotePayload {
  project_id: string;
  task_id: string;
  source_type?: string;
  raw_quote?: string;
  user_interpretation: string;
  context_reflection?: string;
  source_anchor?: MaterialSourceAnchor;
  tags?: string[];
}

export interface MaterialNoteDO {
  id: string;
  project_id: string;
  project_name?: string;
  task_id: string;
  source_type: string;
  raw_quote?: string;
  user_interpretation: string;
  context_reflection?: string;
  tags: string[];
  created_at: string;
  anchor_summary?: string;
  source_anchor?: MaterialSourceAnchor;
}

export interface MaterialNotePage {
  items: MaterialNoteDO[];
  next_cursor: string | null;
  has_next: boolean;
}
