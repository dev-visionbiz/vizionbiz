import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Toaster } from '@/components/ui/toaster'

const WIDE_CONTENT_ROUTES = ['/escritorio/documentos', '/portal/documentos']

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const isWide = WIDE_CONTENT_ROUTES.some(r => location.pathname.startsWith(r))
    if (isWide && !sidebarPinned) {
      setSidebarCollapsed(true)
    }
  }, [location.pathname, sidebarPinned])

  function handleToggleCollapse() {
    setSidebarCollapsed(c => !c)
    setSidebarPinned(false)
  }

  function handleTogglePin() {
    if (!sidebarPinned) {
      setSidebarCollapsed(false)
      setSidebarPinned(true)
    } else {
      setSidebarPinned(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <Sidebar
        collapsed={sidebarCollapsed}
        pinned={sidebarPinned}
        mobileOpen={mobileSidebarOpen}
        onToggleCollapse={handleToggleCollapse}
        onTogglePin={handleTogglePin}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenuToggle={() => setMobileSidebarOpen((o) => !o)} />
        <main className="flex-1 overflow-auto p-4 md:p-6 min-h-0">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
