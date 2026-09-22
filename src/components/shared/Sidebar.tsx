import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, DollarSign, Settings,
  Home, FolderOpen, Receipt, ChevronLeft, ChevronRight, Pin, PinOff,
  Network, UserCog, ClipboardList, CheckSquare, Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/auth/AuthProvider'
import { useTenant } from '@/data/hooks/useTenant'
import { usePortalAcesso } from '@/data/hooks/usePortalAcesso'
import { podeAcessarModulo } from '@/auth/roles'
import type { ModuloEscritorio } from '@/domain/types'

const escritorioNavBase: { label: string; href: string; icon: React.ElementType; modulo?: ModuloEscritorio }[] = [
  { label: 'Dashboard', href: '/escritorio/dashboard', icon: LayoutDashboard },
  { label: 'Tarefas', href: '/escritorio/tarefas', icon: CheckSquare, modulo: 'tarefas' },
  { label: 'Clientes', href: '/escritorio/clientes', icon: Users, modulo: 'clientes' },
  { label: 'Grupos', href: '/escritorio/grupos', icon: Network, modulo: 'grupos' },
  { label: 'Documentos', href: '/escritorio/documentos', icon: FolderOpen, modulo: 'documentos' },
  { label: 'Financeiro', href: '/escritorio/financeiro', icon: DollarSign, modulo: 'financeiro' },
  { label: 'Obrigações', href: '/escritorio/obrigacoes', icon: ClipboardList, modulo: 'obrigacoes' },
  { label: 'Demandas', href: '/escritorio/demandas', icon: Briefcase, modulo: 'demandas' },
  { label: 'Configurações', href: '/escritorio/configuracoes', icon: Settings },
]

const clienteNavBase: { label: string; href: string; icon: React.ElementType; somenteResponsavel?: boolean }[] = [
  { label: 'Início', href: '/portal/inicio', icon: Home },
  { label: 'Documentos', href: '/portal/documentos', icon: FolderOpen },
  { label: 'Financeiro', href: '/portal/financeiro', icon: Receipt },
  { label: 'Equipe', href: '/portal/equipe', icon: UserCog, somenteResponsavel: true },
]

interface SidebarProps {
  collapsed: boolean
  pinned: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onTogglePin: () => void
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, pinned, mobileOpen, onToggleCollapse, onTogglePin, onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const { currentUser } = useAuth()
  const { data: tenant } = useTenant(currentUser?.tenant_id ?? '')
  const isCliente = currentUser?.papel === 'cliente'
  const { secoesPermitidas, papelPortal } = usePortalAcesso()

  const nav = isCliente
    ? clienteNavBase.filter((item) => {
        if (item.somenteResponsavel && papelPortal !== 'responsavel') return false
        if (!item.somenteResponsavel && item.href !== '/portal/inicio') {
          const secao = item.href.split('/').pop() as 'documentos' | 'financeiro'
          return secoesPermitidas.includes(secao)
        }
        return true
      })
    : escritorioNavBase.filter((item) => {
        if (!item.modulo) return true // dashboard e configurações sempre visíveis
        if (!currentUser) return false
        return podeAcessarModulo(currentUser, item.modulo)
      })

  const [hoverExpanded, setHoverExpanded] = useState(false)

  const isExpanded = !collapsed || pinned
  const isHoverMode = collapsed && !pinned && hoverExpanded
  const showFull = isExpanded || isHoverMode

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={cn(
          'hidden lg:block shrink-0 relative transition-all duration-200',
          isExpanded ? 'w-60' : 'w-14',
        )}
      >
        <aside
          className={cn(
            'flex flex-col bg-card border-r transition-all duration-200',
            isHoverMode
              ? 'absolute inset-y-0 left-0 w-60 z-40 shadow-xl'
              : cn('h-full', showFull ? 'w-60' : 'w-14'),
          )}
          onMouseEnter={() => { if (collapsed && !pinned) setHoverExpanded(true) }}
          onMouseLeave={() => setHoverExpanded(false)}
        >
          <div
            className={cn(
              'h-14 border-b flex items-center shrink-0',
              showFull ? 'px-4 justify-between' : 'justify-center px-2',
            )}
          >
            {showFull && (
              tenant?.logo_url
                ? <img src={tenant.logo_url} alt={tenant.nome} className="h-8 w-auto max-w-35 object-contain" />
                : <span className="font-bold text-lg text-primary truncate">{tenant?.nome ?? 'VizionBiz'}</span>
            )}
            <div className={cn('flex items-center gap-1', !showFull && 'w-full justify-center')}>
              {showFull && (
                <button
                  onClick={onTogglePin}
                  title={pinned ? 'Desafixar menu' : 'Fixar menu aberto'}
                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </button>
              )}
              {!isHoverMode && (
                <button
                  onClick={onToggleCollapse}
                  title={isExpanded ? 'Recolher menu' : 'Expandir menu'}
                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>

          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {nav.map((item) => {
              const active = location.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={!showFull ? item.label : undefined}
                  className={cn(
                    'flex items-center rounded-md text-sm font-medium transition-colors',
                    showFull ? 'gap-3 px-3 py-2' : 'justify-center p-2',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {showFull && item.label}
                </Link>
              )
            })}
          </nav>
        </aside>
      </div>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-60 bg-card border-r flex flex-col lg:hidden transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-14 border-b px-4 flex items-center justify-between shrink-0">
          {tenant?.logo_url
            ? <img src={tenant.logo_url} alt={tenant.nome} className="h-8 w-auto max-w-35 object-contain" />
            : <span className="font-bold text-lg text-primary">{tenant?.nome ?? 'VizionBiz'}</span>
          }
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors min-h-[44px]',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
