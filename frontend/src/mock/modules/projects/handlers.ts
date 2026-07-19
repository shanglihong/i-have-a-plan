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

  http.post("/api/projects", async ({ request }) => {
    await delay(400);
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const title = (formData.get("title") as string) || "未命名阅读项目";
      const deadline = (formData.get("deadline") as string) || "2026-12-31";

      const newProject = {
        id: "proj_" + Date.now(),
        title,
        type: "READING" as const,
        status: "ACTIVE" as const,
        progress: 0,
        deadline: deadline.split("T")[0],
        tags: ["精读"],
        notes: 0,
        createdAt: new Date().toISOString(),
      };
      MOCK_PROJECTS_DATA.unshift(newProject);
      return HttpResponse.json(newProject, { status: 201 });
    } else {
      const body = (await request.json()) as Record<string, any>;
      const newProject = {
        id: "proj_" + Date.now(),
        title: body.title || "未命名计划项目",
        type: "PLAN" as const,
        status: "ACTIVE" as const,
        progress: 0,
        deadline: (body.deadline || "2026-12-31").split("T")[0],
        tags: ["计划"],
        tasks: 5,
        createdAt: new Date().toISOString(),
      };
      MOCK_PROJECTS_DATA.unshift(newProject);
      return HttpResponse.json(newProject, { status: 201 });
    }
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
