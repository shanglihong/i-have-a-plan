import { useQuery } from "@tanstack/react-query";
import { api } from "../../../shared/api";
import { TocResponseDTO, BookDetailDO, ChapterContentResponseDTO } from "../model/types";

export const BOOK_QUERY_KEYS = {
  all: ["books"] as const,
  details: () => [...BOOK_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...BOOK_QUERY_KEYS.details(), id] as const,
  tocs: () => [...BOOK_QUERY_KEYS.all, "toc"] as const,
  toc: (bookId: string) => [...BOOK_QUERY_KEYS.tocs(), bookId] as const,
  chapterContents: () => [...BOOK_QUERY_KEYS.all, "chapterContent"] as const,
  chapterContent: (bookId: string, chapterId: string, offset: number = 0, limit: number = 50) =>
    [...BOOK_QUERY_KEYS.chapterContents(), bookId, chapterId, offset, limit] as const,
};

export function useBookTocQuery(bookId?: string) {
  return useQuery<TocResponseDTO>({
    queryKey: BOOK_QUERY_KEYS.toc(bookId || ""),
    queryFn: async () => {
      if (!bookId) return { book_id: "", toc_tree: [] };
      const res = await api.get(`/books/${bookId}/toc`);
      const body = res.data?.data || res.data;
      return body;
    },
    enabled: Boolean(bookId),
  });
}

export function useChapterContentQuery(
  bookId?: string,
  chapterId?: string,
  offset: number = 0,
  limit: number = 50
) {
  return useQuery<ChapterContentResponseDTO>({
    queryKey: BOOK_QUERY_KEYS.chapterContent(bookId || "", chapterId || "", offset, limit),
    queryFn: async () => {
      if (!bookId || !chapterId) {
        return {
          book_id: "",
          chapter_id: "",
          chapter_index: 0,
          total_blocks: 0,
          has_more: false,
          blocks: [],
        };
      }
      const res = await api.get(`/books/${bookId}/chapters/${chapterId}`, {
        params: { offset, limit },
      });
      const body = res.data?.data || res.data;
      return body;
    },
    enabled: Boolean(bookId && chapterId),
  });
}

export function useBookDetailQuery(bookId?: string) {
  return useQuery<BookDetailDO>({
    queryKey: BOOK_QUERY_KEYS.detail(bookId || ""),
    queryFn: async () => {
      if (!bookId) throw new Error("bookId is required");
      const res = await api.get(`/books/${bookId}`);
      return res.data?.data || res.data;
    },
    enabled: Boolean(bookId),
  });
}
