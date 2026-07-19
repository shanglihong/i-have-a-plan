import { http, HttpResponse, delay } from "msw";
import { MOCK_NOTES_DATA } from "./data";

export const notesHandlers = [
  http.get("/api/notes/featured", async () => {
    await delay(200);
    return HttpResponse.json({
      items: MOCK_NOTES_DATA,
    });
  }),

  http.get("/api/projects/:id/notes", async () => {
    await delay(250);
    return HttpResponse.json({
      items: MOCK_NOTES_DATA,
      next_cursor: null,
      has_next: false,
    });
  }),

  http.post("/api/notes", async ({ request }) => {
    const data = (await request.json()) as Record<string, any>;
    await delay(300);
    return HttpResponse.json(
      {
        id: "n_new_" + Date.now(),
        status: "CREATED",
        ...data,
      },
      { status: 201 }
    );
  }),
];
