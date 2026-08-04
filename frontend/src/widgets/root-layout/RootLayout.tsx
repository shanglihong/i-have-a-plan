import { Outlet, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { ProjectTreeDrawer, type ProjectDrawerMode } from "./components/ProjectTreeDrawer"
import { ActivityBar } from "./components/ActivityBar"
import { HeaderTopbar } from "./components/HeaderTopbar"

export default function RootLayout() {
  const location = useLocation()
  const [activeDrawerMode, setActiveDrawerMode] = useState<ProjectDrawerMode | null>(null)

  // 路由变化时自动收缩阅读/计划目录抽屉
  useEffect(() => {
    setActiveDrawerMode(null)
  }, [location.pathname])

  const handleToggleDrawer = (mode: ProjectDrawerMode) => {
    setActiveDrawerMode((prev) => (prev === mode ? null : mode))
  }

  const handleClearDrawer = () => {
    setActiveDrawerMode(null)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#090d16] text-slate-100">
      {/* Primary Activity Bar Navigation */}
      <ActivityBar
        activeDrawerMode={activeDrawerMode}
        onToggleDrawer={handleToggleDrawer}
        onClearDrawer={handleClearDrawer}
      />

      {/* Project Tree Drawer Panel */}
      <ProjectTreeDrawer
        isOpen={activeDrawerMode !== null}
        mode={activeDrawerMode || "reading"}
        onClose={handleClearDrawer}
      />

      {/* Main content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Topbar */}
        <HeaderTopbar />

        {/* Page Main Content Container */}
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
