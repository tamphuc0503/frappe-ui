import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const SIDEBAR_KEY = 'sidebar_collapsed'

export function AppShell() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed))
  }, [collapsed])

  function toggle() {
    setCollapsed((prev) => !prev)
  }

  return (
    <div className="h-svh overflow-hidden bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <Header sidebarCollapsed={collapsed} />

      {/* Main content area — viewport-pinned; pages own their own scroll. */}
      <main
        className={`transition-all duration-300 h-svh pt-16 flex flex-col overflow-hidden ${
          collapsed ? 'pl-16' : 'pl-64'
        }`}
      >
        <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
