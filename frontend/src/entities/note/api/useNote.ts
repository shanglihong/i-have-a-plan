import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api";
import { UnifiedReadingNoteDO, CreateNotePayload } from "../model/types";

export const NOTE_QUERY_KEYS = {
  all: ["notes"] as const,
  featured: () => [...NOTE_QUERY_KEYS.all, "featured"] as const,
  byProject: (projectId: string, cursor?: string) =>
    [...NOTE_QUERY_KEYS.all, "project", projectId, { cursor }] as const,
};

export function useFeaturedNotesQuery() {
  return useQuery<{ items: UnifiedReadingNoteDO[] }>({
    queryKey: NOTE_QUERY_KEYS.featured(),
    queryFn: async () => {
      const res = await api.get("/notes/featured");
      return res.data;
    },
  });
}

export function useProjectNotesQuery(projectId: string, cursor?: string) {
  return useQuery<{ items: UnifiedReadingNoteDO[]; next_cursor: string | null; has_next: boolean }>({
    queryKey: NOTE_QUERY_KEYS.byProject(projectId, cursor),
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/notes`, {
        params: { cursor, limit: 15 },
      });
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateNotePayload) => {
      const res = await api.post("/notes", payload);
      return res.data;
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: NOTE_QUERY_KEYS.featured() });
      if (payload.project_id) {
        queryClient.invalidateQueries({ queryKey: NOTE_QUERY_KEYS.byProject(payload.project_id) });
      }
    },
  });
}
