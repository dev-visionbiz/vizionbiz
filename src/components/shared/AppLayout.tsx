import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { TabBar } from './TabBar'
import { Toaster } from '@/components/ui/toaster'
import { PomodoroProvider } from '@/context/PomodoroContext'
import { TarefaAtivaProvider } from '@/context/TarefaAtivaContext'
import { NavigationTabsProvider } from '@/context/NavigationTabsContext'
import { TarefaAtivaFloat } from './TarefaAtivaFloat'
import { ClienteContextDrawer } from './ClienteContextDrawer'
import { ImpersonationBanner } from './ImpersonationBanner'
import { getPageTitle } from '@/lib/pageTitle'

const WIDE_CONTENT_ROUTES = ['/escritorio/documentos', '/portal/documentos']

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [clienteDrawerOpen, setClienteDrawerOpen] = useState(false)
  const location = useLocation()
  const swipeStartX = useRef<number | null>(null)

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

  function handleBackdropPointerDown(e: React.PointerEvent) {
    swipeStartX.current = e.clientX
  }

  function handleBackdropPointerUp(e: React.PointerEvent) {
    if (swipeStartX.current === null) return
    const deltaX = e.clientX - swipeStartX.current
    swipeStartX.current = null
    if (deltaX < -50 || Math.abs(deltaX) < 10) {
      setMobileSidebarOpen(false)
    }
  }

  const pageTitle = getPageTitle(location.pathname)

  return (
    <NavigationTabsProvider>
    <TarefaAtivaProvider>
    <PomodoroProvider>
      <div className="flex flex-col h-screen">
        <ImpersonationBanner />
        <div className="flex flex-1 overflow-hidden">
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onPointerDown={handleBackdropPointerDown}
              onPointerUp={handleBackdropPointerUp}
            />
          )}
          <Sidebar
            collapsed={sidebarCollapsed}
            pinned={sidebarPinned}
            mobileOpen={mobileSidebarOpen}
            onToggleCollapse={handleToggleCollapse}
            onTogglePin={handleTogglePin}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            onOpenClienteDrawer={() => setClienteDrawerOpen(true)}
          />
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            <Header
              onMenuToggle={() => setMobileSidebarOpen(o => !o)}
              pageTitle={pageTitle}
            />
            <TabBar />
            <main className="flex-1 overflow-auto p-4 md:p-6 min-h-0 pb-20 lg:pb-6">
              <Outlet />
            </main>
          </div>
          <BottomNav onOpenMenu={() => setMobileSidebarOpen(true)} />
          <Toaster />
          <TarefaAtivaFloat />
          <ClienteContextDrawer
            open={clienteDrawerOpen}
            onClose={() => setClienteDrawerOpen(false)}
          />
        </div>
      </div>
    </PomodoroProvider>
    </TarefaAtivaProvider>
    </NavigationTabsProvider>
  )
}
