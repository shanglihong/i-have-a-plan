import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api";
import {
  ProjectDO,
  ProjectStatus,
  CreateProjectPayload,
} from "../model/types";

export const PROJECT_QUERY_KEYS = {
  all: ["projects"] as const,
  lists: () => [...PROJECT_QUERY_KEYS.all, "list"] as const,
  list: (status?: string) => [...PROJECT_QUERY_KEYS.lists(), { status }] as const,
  details: () => [...PROJECT_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...PROJECT_QUERY_KEYS.details(), id] as const,
};

export function useProjectsQuery(status?: ProjectStatus | "ALL") {
  return useQuery<{ items: ProjectDO[]; total: number }>({
    queryKey: PROJECT_QUERY_KEYS.list(status),
    queryFn: async () => {
      const params = status && status !== "ALL" ? { status } : {};
      const res = await api.get("/projects", { params });
      return res.data;
    },
  });
}

export function useProjectDetailQuery(id: string) {
  return useQuery<ProjectDO>({
    queryKey: PROJECT_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get(`/projects/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  const safeToISOString = (dateStr: string) => {
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return new Date().toISOString();
      return parsed.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const formattedDeadline = safeToISOString(payload.deadline);

      if (payload.type === "READING") {
        const formData = new FormData();
        formData.append("title", payload.title.trim());
        formData.append("type", "READING");
        formData.append("deadline", formattedDeadline);
        if (payload.file) {
          formData.append("file", payload.file);
        }
        if (payload.kb_id) {
          formData.append("kb_id", payload.kb_id);
        }
        if (payload.kb_name) {
          formData.append("kb_name", payload.kb_name);
        }
        const res = await api.post("/projects", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
      } else {
        const body = {
          title: payload.title.trim(),
          type: "PLAN",
          deadline: formattedDeadline,
          skill_id: payload.skill_id || undefined,
          kb_id: payload.kb_id || undefined,
          kb_name: payload.kb_name || undefined,
        };
        const res = await api.post("/projects", body);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.all });
    },
  });
}

export function useSuspendProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/projects/${id}/suspend`);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.lists() });
    },
  });
}

export function useResumeProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/projects/${id}/resume`);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.lists() });
    },
  });
}

export function useArchiveProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, experienceContent }: { id: string; experienceContent?: string }) => {
      const res = await api.post(`/projects/${id}/archive`, {
        experience_content: experienceContent,
      });
      return res.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.lists() });
    },
  });
}
