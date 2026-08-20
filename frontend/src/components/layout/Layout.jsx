import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import Sidebar from '@/components/layout/Sidebar'
import TopNavbar from '@/components/layout/TopNavbar'
import { useAppearance } from '@/context/AppearanceContext'

function Layout() {
  const { sidebarCollapsed, toggleSidebar } = useAppearance()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-canvas text-ink-primary">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onCollapse={toggleSidebar}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-section"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

