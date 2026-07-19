import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api";
import { GraphData, PeekNodeResponse } from "../model/types";

export const GRAPH_QUERY_KEYS = {
  all: ["graph"] as const,
  full: () => [...GRAPH_QUERY_KEYS.all, "full"] as const,
  peek: (nodeId: string) => [...GRAPH_QUERY_KEYS.all, "peek", nodeId] as const,
};

export function useFullGraphQuery() {
  return useQuery<GraphData>({
    queryKey: GRAPH_QUERY_KEYS.full(),
    queryFn: async () => {
      const res = await api.get("/graph/all");
      return res.data;
    },
  });
}

export function useQuickPeekQuery(nodeId?: string) {
  return useQuery<PeekNodeResponse>({
    queryKey: GRAPH_QUERY_KEYS.peek(nodeId || ""),
    queryFn: async () => {
      const res = await api.get("/graph/peek", { params: { node_id: nodeId } });
      return res.data;
    },
    enabled: !!nodeId,
  });
}

export function useSyncGraphMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await api.post("/graph/sync", { project_id: projectId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRAPH_QUERY_KEYS.all });
    },
  });
}
