import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api";
import { TaskDO, RescheduleTaskPayload, UpdateTaskStatusPayload } from "../model/types";

export const TASK_QUERY_KEYS = {
  all: ["tasks"] as const,
  byProject: (projectId: string) => [...TASK_QUERY_KEYS.all, "project", projectId] as const,
};

export function useProjectTasksQuery(projectId: string) {
  return useQuery<TaskDO[]>({
    queryKey: TASK_QUERY_KEYS.byProject(projectId),
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useRescheduleTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RescheduleTaskPayload) => {
      const res = await api.post("/tasks/reschedule", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.all });
    },
  });
}

export function useUpdateTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ task_id, status }: UpdateTaskStatusPayload) => {
      const res = await api.patch(`/tasks/${task_id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.all });
    },
  });
}
