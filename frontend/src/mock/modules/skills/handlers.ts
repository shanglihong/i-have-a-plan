import { http, HttpResponse, delay } from "msw";
import { MOCK_ACTIVE_SKILLS, MOCK_PRESET_SKILLS } from "./data";

export const skillsHandlers = [
  http.get("/api/skills/active", async () => {
    await delay(200);
    return HttpResponse.json({
      items: MOCK_ACTIVE_SKILLS,
    });
  }),

  http.get("/api/skills/search", async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("query") || "";
    await delay(250);

    const filtered = query
      ? MOCK_PRESET_SKILLS.filter((s) => s.title.includes(query))
      : MOCK_PRESET_SKILLS;

    return HttpResponse.json({
      items: filtered,
    });
  }),

  http.post("/api/skills/:id/approve", async ({ request, params }) => {
    const { id } = params;
    const data = (await request.json()) as Record<string, any>;
    await delay(400);

    if (data?.cyclePath?.length > 0) {
      return HttpResponse.json(
        {
          type: "https://api.example.com/errors/topology-cycle",
          title: "Topological Cycle Detected",
          status: 400,
          detail: "依赖解析失败，检测到步骤循环依赖。",
          instance: `/api/skills/${id}/approve`,
          extension_fields: {
            cycle_path: data.cyclePath,
          },
        },
        { status: 400 }
      );
    }

    return HttpResponse.json({ status: "ACTIVE" });
  }),
];
