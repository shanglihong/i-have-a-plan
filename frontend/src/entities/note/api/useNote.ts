import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api";
import {
  UnifiedReadingNoteDO,
  CreateMaterialNotePayload,
  MaterialNotePage,
} from "../model/types";

export const NOTE_QUERY_KEYS = {
  all: ["notes"] as const,
  featured: () => [...NOTE_QUERY_KEYS.all, "featured"] as const,
  material: (projectId?: string, cursor?: string, keyword?: string) =>
    [...NOTE_QUERY_KEYS.all, "material", { projectId, cursor, keyword }] as const,
};

export function useFeaturedNotesQuery() {
  return useQuery<{ items: UnifiedReadingNoteDO[] }>({
    queryKey: NOTE_QUERY_KEYS.featured(),
    queryFn: async () => {
      const res = await api.get("/notes/featured");
      return res.data?.data || res.data;
    },
  });
}

export function useMaterialNotesQuery(params: {
  project_id?: string;
  cursor?: string;
  limit?: number;
  keyword?: string;
}) {
  return useQuery<MaterialNotePage>({
    queryKey: NOTE_QUERY_KEYS.material(params.project_id, params.cursor, params.keyword),
    queryFn: async () => {
      const res = await api.get("/notes/material", {
        params,
      });
      return res.data?.data || res.data;
    },
  });
}

export function useCreateMaterialNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateMaterialNotePayload) => {
      const res = await api.post("/notes/material", payload);
      return res.data?.data || res.data;
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: NOTE_QUERY_KEYS.material(payload.project_id) });
      queryClient.invalidateQueries({ queryKey: NOTE_QUERY_KEYS.material() });
    },
  });
}

export function useUpdateMaterialNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      user_interpretation,
      context_reflection,
    }: {
      noteId: string;
      user_interpretation?: string;
      context_reflection?: string;
    }) => {
      const res = await api.put(`/notes/material/${noteId}`, {
        user_interpretation,
        context_reflection,
      });
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTE_QUERY_KEYS.all });
    },
  });
}

export function useDeleteMaterialNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await api.delete(`/notes/material/${noteId}`);
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTE_QUERY_KEYS.all });
    },
  });
}
