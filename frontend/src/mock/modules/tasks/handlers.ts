import { http, HttpResponse, delay } from "msw";
import { MOCK_TASKS_DATA } from "./data";

export const tasksHandlers = [
  http.get("/api/projects/:id/tasks", async () => {
    await delay(200);
    return HttpResponse.json(MOCK_TASKS_DATA);
  }),

  http.post("/api/tasks/reschedule", async () => {
    await delay(350);
    return HttpResponse.json({
      rescheduled_count: 5,
      affected_tasks: [],
    });
  }),
];
