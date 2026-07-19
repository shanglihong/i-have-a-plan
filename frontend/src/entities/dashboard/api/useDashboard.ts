import { useQuery } from "@tanstack/react-query";
import { api } from "../../../shared/api";
import { DashboardStatsDO } from "../model/types";

export const DASHBOARD_QUERY_KEYS = {
  all: ["dashboard-stats"] as const,
};

export function useDashboardStatsQuery() {
  return useQuery<DashboardStatsDO>({
    queryKey: DASHBOARD_QUERY_KEYS.all,
    queryFn: async () => {
      const res = await api.get("/dashboard/stats");
      return res.data;
    },
  });
}
