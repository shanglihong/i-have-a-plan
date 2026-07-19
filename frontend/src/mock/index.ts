import { projectsHandlers } from "./modules/projects/handlers";
import { dashboardHandlers } from "./modules/dashboard/handlers";
import { notesHandlers } from "./modules/notes/handlers";
import { skillsHandlers } from "./modules/skills/handlers";
import { tasksHandlers } from "./modules/tasks/handlers";
import { graphHandlers } from "./modules/graph/handlers";

export * from "./modules/projects/data";
export * from "./modules/dashboard/data";
export * from "./modules/notes/data";
export * from "./modules/skills/data";
export * from "./modules/tasks/data";
export * from "./modules/graph/data";

export const handlers = [
  ...projectsHandlers,
  ...dashboardHandlers,
  ...notesHandlers,
  ...skillsHandlers,
  ...tasksHandlers,
  ...graphHandlers,
];

