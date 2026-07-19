import os
import re

app_tsx_path = "src/App.tsx"

with open(app_tsx_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

def get_section(start_str, end_str=None):
    start_idx = -1
    end_idx = -1
    for i, line in enumerate(lines):
        if start_str in line:
            start_idx = i
        if end_str and end_str in line and start_idx != -1 and i > start_idx:
            end_idx = i
            break
    if end_idx == -1:
        end_idx = len(lines)
    return "".join(lines[start_idx:end_idx])

# Imports
imports_code = "".join(lines[0:57])

# Data
mock_data_code = get_section("─── Mock Data", "─── Shared Components")
mock_data_code = mock_data_code.replace("const MOCK_", "export const MOCK_")

# Shared
shared_code = get_section("─── Shared Components", "─── Navigation Layout")
shared_code = shared_code.replace("function StatusBadge", "export function StatusBadge")
shared_code = shared_code.replace("function ProgressBar", "export function ProgressBar")
shared_code = shared_code.replace("function SuspendedOverlay", "export function SuspendedOverlay")

# Layout
layout_code = get_section("─── Navigation Layout", "─── Dashboard Page")
layout_code = layout_code.replace("function RootLayout", "export default function RootLayout")

# Pages
dashboard_code = get_section("─── Dashboard Page", "─── Reading Workspace")
dashboard_code = dashboard_code.replace("function DashboardPage", "export default function DashboardPage")

reading_code = get_section("─── Reading Workspace", "─── Plan Workspace")
reading_code = reading_code.replace("function ReadingWorkspacePage", "export default function ReadingWorkspacePage")

plan_code = get_section("─── Plan Workspace", "─── Global Graph")
plan_code = plan_code.replace("function PlanWorkspacePage", "export default function PlanWorkspacePage")

graph_code = get_section("─── Global Graph", "─── Skill Sandbox")
graph_code = graph_code.replace("function GlobalGraphPage", "export default function GlobalGraphPage")

sandbox_code = get_section("─── Skill Sandbox", "─── Router")
sandbox_code = sandbox_code.replace("function SkillSandboxPage", "export default function SkillSandboxPage")

router_code = get_section("─── Router")


def write_file(path, content, extra_imports=""):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        if path.endswith(".ts") or path.endswith(".tsx"):
            f.write(imports_code)
            if extra_imports:
                f.write(extra_imports + "\n\n")
        f.write(content)

# write mock
write_file("src/mock/data.ts", mock_data_code)

write_file("src/components/shared/index.tsx", shared_code)

mock_imports = """
import { 
  MOCK_PROJECTS, MOCK_NOTES, MOCK_TASKS, 
  MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES, MOCK_SANDBOX_NODES 
} from "../../mock/data";
"""
shared_imports = """
import { StatusBadge, ProgressBar, SuspendedOverlay } from "../../components/shared";
"""

write_file("src/layouts/RootLayout.tsx", layout_code)
write_file("src/pages/DashboardPage.tsx", dashboard_code, mock_imports + shared_imports)
write_file("src/pages/ReadingWorkspacePage.tsx", reading_code, mock_imports + shared_imports)
write_file("src/pages/PlanWorkspacePage.tsx", plan_code, mock_imports + shared_imports)
write_file("src/pages/GlobalGraphPage.tsx", graph_code, mock_imports + shared_imports)
write_file("src/pages/SkillSandboxPage.tsx", sandbox_code, mock_imports + shared_imports)

# Rewrite App.tsx
app_content = imports_code + """
import RootLayout from "./layouts/RootLayout";
import DashboardPage from "./pages/DashboardPage";
import ReadingWorkspacePage from "./pages/ReadingWorkspacePage";
import PlanWorkspacePage from "./pages/PlanWorkspacePage";
import GlobalGraphPage from "./pages/GlobalGraphPage";
import SkillSandboxPage from "./pages/SkillSandboxPage";

""" + router_code

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app_content)

print("Split completed.")
