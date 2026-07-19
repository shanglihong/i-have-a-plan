import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api";
import {
  SkillDO,
  CompileSkillPayload,
  ApproveSkillPayload,
} from "../model/types";

export const SKILL_QUERY_KEYS = {
  all: ["skills"] as const,
  active: () => [...SKILL_QUERY_KEYS.all, "active"] as const,
  search: (query?: string) => [...SKILL_QUERY_KEYS.all, "search", { query }] as const,
};

export function useActiveSkillsQuery() {
  return useQuery<{ items: SkillDO[] }>({
    queryKey: SKILL_QUERY_KEYS.active(),
    queryFn: async () => {
      const res = await api.get("/skills/active");
      return res.data;
    },
  });
}

export function useSearchSkillsQuery(query?: string) {
  return useQuery<{ items: SkillDO[] }>({
    queryKey: SKILL_QUERY_KEYS.search(query),
    queryFn: async () => {
      const res = await api.get("/skills/search", { params: { query } });
      return res.data;
    },
  });
}

export function useCompileSkillMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CompileSkillPayload) => {
      const res = await api.post("/skills/compile", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILL_QUERY_KEYS.all });
    },
  });
}

export function useApproveSkillMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ skill_id, cyclePath }: ApproveSkillPayload) => {
      const res = await api.post(`/skills/${skill_id}/approve`, { cyclePath });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILL_QUERY_KEYS.all });
    },
  });
}
