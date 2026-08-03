import { http, HttpResponse, delay } from "msw";
import { MOCK_PROJECTS_DATA } from "./data";

export const projectsHandlers = [
  http.get("/api/projects", async ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let filtered = MOCK_PROJECTS_DATA;
    if (status && status !== "ALL") {
      filtered = filtered.filter((p) => p.status === status);
    }

    await delay(250);
    return HttpResponse.json({
      items: filtered,
      total: filtered.length,
      page: 1,
      size: 20,
      has_next: false,
    });
  }),

  http.get("/api/projects/:id", async ({ params }) => {
    const { id } = params;
    const project = MOCK_PROJECTS_DATA.find((p) => p.id === id);
    await delay(200);
    if (!project) {
      return HttpResponse.json(
        {
          type: "https://api.example.com/errors/not-found",
          title: "Project Not Found",
          status: 404,
        },
        { status: 404 }
      );
    }
    return HttpResponse.json(project);
  }),


  http.post("/api/projects/:id/suspend", async ({ params }) => {
    const { id } = params;
    const project = MOCK_PROJECTS_DATA.find((p) => p.id === id);
    if (project) {
      project.status = "SUSPENDED";
    }
    await delay(300);
    return HttpResponse.json({ status: "SUSPENDED" });
  }),

  http.post("/api/projects/:id/resume", async ({ params }) => {
    const { id } = params;
    const project = MOCK_PROJECTS_DATA.find((p) => p.id === id);
    if (project) {
      project.status = "ACTIVE";
    }
    await delay(300);
    return HttpResponse.json({ status: "ACTIVE" });
  }),
];
