import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import RootLayout from "./layouts/RootLayout";
import DashboardPage from "./pages/DashboardPage";
import ReadingWorkspacePage from "./pages/ReadingWorkspacePage";
import PlanWorkspacePage from "./pages/PlanWorkspacePage";
import GlobalGraphPage from "./pages/GlobalGraphPage";
import SkillSandboxPage from "./pages/SkillSandboxPage";

// ─── Router ───────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const router = createBrowserRouter([
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
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}