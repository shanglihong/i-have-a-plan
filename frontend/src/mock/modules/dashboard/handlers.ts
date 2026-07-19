import { http, HttpResponse, delay } from "msw";
import { MOCK_DASHBOARD_STATS } from "./data";

export const dashboardHandlers = [
  http.get("/api/dashboard/stats", async () => {
    await delay(200);
    return HttpResponse.json(MOCK_DASHBOARD_STATS);
  }),
];
