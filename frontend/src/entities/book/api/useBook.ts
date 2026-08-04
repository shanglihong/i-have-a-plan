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

// 全量加载某章节的所有 blocks（内部循环请求分页直到 has_more=false）
// 对外暴露与 useChapterContentQuery 相同的数据结构，调用方无需感知分页
export function useAllChapterBlocksQuery(bookId?: string, chapterId?: string) {
  return useQuery<ChapterContentResponseDTO>({
    queryKey: [...BOOK_QUERY_KEYS.chapterContents(), bookId || "", chapterId || "", "all"],
    queryFn: async () => {
      if (!bookId || !chapterId) {
        return { book_id: "", chapter_id: "", chapter_index: 0, total_blocks: 0, has_more: false, blocks: [] };
      }

      const limit = 50;
      let offset = 0;
      let allBlocks: ChapterContentResponseDTO["blocks"] = [];
      let lastPage: ChapterContentResponseDTO | null = null;

      while (true) {
        const res = await api.get(`/books/${bookId}/chapters/${chapterId}`, {
          params: { offset, limit },
        });
        const page: ChapterContentResponseDTO = res.data?.data || res.data;
        allBlocks = [...allBlocks, ...page.blocks];
        lastPage = page;
        if (!page.has_more) break;
        offset += limit;
      }

      return { ...lastPage!, blocks: allBlocks, has_more: false };
    },
    enabled: Boolean(bookId && chapterId),
  });
}
