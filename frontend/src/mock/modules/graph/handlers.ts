import { http, HttpResponse, delay } from "msw";
import { MOCK_GRAPH_DATA } from "./data";

export const graphHandlers = [
  http.get("/api/graph/all", async () => {
    await delay(250);
    return HttpResponse.json(MOCK_GRAPH_DATA);
  }),
];
