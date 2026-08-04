import { useQuery } from "@tanstack/react-query";
import { api } from "../../../shared/api";
import { TocResponseDTO, BookDetailDO } from "../model/types";

export const BOOK_QUERY_KEYS = {
  all: ["books"] as const,
  details: () => [...BOOK_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...BOOK_QUERY_KEYS.details(), id] as const,
  tocs: () => [...BOOK_QUERY_KEYS.all, "toc"] as const,
  toc: (bookId: string) => [...BOOK_QUERY_KEYS.tocs(), bookId] as const,
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
