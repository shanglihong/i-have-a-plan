import { projectsHandlers } from "./modules/projects/handlers";
import { dashboardHandlers } from "./modules/dashboard/handlers";
import { notesHandlers } from "./modules/notes/handlers";
import { skillsHandlers } from "./modules/skills/handlers";
import { tasksHandlers } from "./modules/tasks/handlers";
import { graphHandlers } from "./modules/graph/handlers";

export const handlers = [
  ...projectsHandlers,
  ...dashboardHandlers,
  ...notesHandlers,
  ...skillsHandlers,
  ...tasksHandlers,
  ...graphHandlers,
];
