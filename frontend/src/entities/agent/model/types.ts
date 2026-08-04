export type AnnotationCategory = "concept" | "conclusion" | "quote" | "contrast";

export interface TextAnnotation {
  text: string;
  category: AnnotationCategory;
  explanation?: string;
}

export interface AIAnnotateRequestDTO {
  book_id?: string;
  chapter_id?: string;
  content: string;
}

export interface AIAnnotateResponseDTO {
  chapter_id?: string;
  annotations: TextAnnotation[];
}
