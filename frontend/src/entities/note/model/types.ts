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

export interface NoteVO extends UnifiedReadingNoteDO {
  _ui_is_editable?: boolean;
}

export interface CreateNotePayload {
  project_id: string;
  content: string;
  source_anchor?: SourceAnchor;
}

export interface ExperienceNoteDO {
  id: string;
  project_id: string;
  associated_skill_id?: string;
  content_path: string;
  content?: string;
}
