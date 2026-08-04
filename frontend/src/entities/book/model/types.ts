export interface TocNodeDO {
  id: string;
  title: string;
  level: number;
  target_chapter_id: string;
  target_block_id?: string | null;
  target_page?: number | null;
  children?: TocNodeDO[];
}

export interface TocResponseDTO {
  book_id: string;
  toc_tree: TocNodeDO[];
}

export interface BookDetailDO {
  id: string;
  project_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  parsing_status: string;
  total_chapters: number;
  total_word_count: number;
  storage_path: string;
  content_json_path: string;
  created_at: string;
  updated_at: string;
}
