import { createBrowserRouter, Navigate } from "react-router-dom"
import RootLayout from "../../widgets/root-layout/RootLayout"
import DashboardPage from "../../pages/dashboard"
import ReadingWorkspacePage from "../../pages/reading"
import PlanWorkspacePage from "../../pages/plan"
import GlobalGraphPage from "../../pages/graph"
import SkillSandboxPage from "../../pages/sandbox"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      { path: "dashboard", element: <DashboardPage /> },
      {
        path: "project/read/:id",
        element: <ReadingWorkspacePage />,
      },
      {
        path: "project/plan/:id",
        element: <PlanWorkspacePage />,
      },
      { path: "graph", element: <GlobalGraphPage /> },
      {
        path: "skills/sandbox/:skill_id",
        element: <SkillSandboxPage />,
      },
    ],
  },
])
