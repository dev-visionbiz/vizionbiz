import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { Toaster } from '@/components/ui/toaster'

const WIDE_CONTENT_ROUTES = ['/escritorio/documentos', '/portal/documentos']

const PAGE_TITLES: { test: (p: string) => boolean; title: string }[] = [
  { test: (p) => /^\/escritorio\/clientes\/.+/.test(p), title: 'Ficha do Cliente' },
  { test: (p) => p.startsWith('/escritorio/clientes'), title: 'Clientes' },
  { test: (p) => p.startsWith('/escritorio/dashboard'), title: 'Dashboard' },
  { test: (p) => p.startsWith('/escritorio/documentos'), title: 'Documentos' },
  { test: (p) => p.startsWith('/escritorio/financeiro'), title: 'Financeiro' },
  { test: (p) => /^\/escritorio\/grupos\/.+/.test(p), title: 'Ficha do Grupo' },
  { test: (p) => p.startsWith('/escritorio/grupos'), title: 'Grupos' },
  { test: (p) => p.startsWith('/escritorio/obrigacoes'), title: 'Obrigações' },
  { test: (p) => p.startsWith('/escritorio/tarefas'), title: 'Tarefas' },
  { test: (p) => p.startsWith('/escritorio/demandas'), title: 'Demandas' },
  { test: (p) => p.startsWith('/escritorio/configuracoes'), title: 'Configurações' },
  { test: (p) => p.startsWith('/portal/inicio'), title: 'Início' },
  { test: (p) => p.startsWith('/portal/documentos'), title: 'Documentos' },
  { test: (p) => p.startsWith('/portal/financeiro'), title: 'Financeiro' },
  { test: (p) => p.startsWith('/portal/equipe'), title: 'Equipe' },
]

function getPageTitle(pathname: string): string {
  return PAGE_TITLES.find(({ test }) => test(pathname))?.title ?? ''
}

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
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
    if (deltaX < -50) {
      setMobileSidebarOpen(false)
    } else if (Math.abs(deltaX) < 10) {
      setMobileSidebarOpen(false)
    }
  }

  const pageTitle = getPageTitle(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden">
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
      />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header
          onMenuToggle={() => setMobileSidebarOpen((o) => !o)}
          pageTitle={pageTitle}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6 min-h-0 pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav onOpenMenu={() => setMobileSidebarOpen(true)} />
      <Toaster />
    </div>
  )
}
