import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api";
import {
  ProjectDO,
  ProjectDetailDTO,
  ProjectStatus,
  ProjectType,
  CreateProjectPayload,
} from "../model/types";

export const PROJECT_QUERY_KEYS = {
  all: ["projects"] as const,
  lists: () => [...PROJECT_QUERY_KEYS.all, "list"] as const,
  list: (status?: string, type?: string) =>
    [...PROJECT_QUERY_KEYS.lists(), { status, type }] as const,
  details: () => [...PROJECT_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...PROJECT_QUERY_KEYS.details(), id] as const,
};

export function useProjectsQuery(
  status?: ProjectStatus | "ALL",
  type?: ProjectType
) {
  return useQuery<{ items: ProjectDO[]; total: number }>({
    queryKey: PROJECT_QUERY_KEYS.list(status, type),
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (status && status !== "ALL") {
        params.status = status;
      }
      if (type) {
        params.type = type;
      }
      const res = await api.get("/projects", { params });
      const items = (res.data?.items || []).map((item: any) => ({
        ...item,
        deadline: item.deadline || "",
        createdAt: item.createdAt || item.created_at,
        updatedAt: item.updatedAt || item.updated_at,
        tags: item.tags || [],
      }));
      return {
        items,
        total: res.data?.total ?? items.length,
      };
    },
  });
}

export function useProjectDetailQuery(id: string) {
  return useQuery<ProjectDetailDTO>({
    queryKey: PROJECT_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get(`/projects/${id}/detail`);
      const data = res.data;
      return {
        ...data,
        deadline: data.deadline || "",
        createdAt: data.createdAt || data.created_at,
        updatedAt: data.updatedAt || data.updated_at,
      };
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
        formData.append("deadline", formattedDeadline);
        if (payload.file) {
          formData.append("file", payload.file);
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

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      deadline,
    }: {
      id: string;
      title?: string;
      deadline?: string;
    }) => {
      const res = await api.patch(`/projects/${id}`, { title, deadline });
      return res.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.lists() });
    },
  });
}

export function useSuspendProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/projects/${id}`, { status: "SUSPENDED" });
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.lists() });
    },
  });
}

export function useResumeProjectMutation() {
  return useReactivateProjectMutation();
}

export function useArchiveProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      experienceContent,
    }: {
      id: string;
      experienceContent?: string;
    }) => {
      const archiveRes = await api.post(`/projects/${id}/archive`);
      if (experienceContent) {
        await api.post(`/projects/${id}/experience-note`, {
          experience_content: experienceContent,
        });
      }
      return archiveRes.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.lists() });
    },
  });
}

export function useReactivateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/projects/${id}/reactivate`);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.lists() });
    },
  });
}
