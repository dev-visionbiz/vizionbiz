import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, DollarSign, Settings,
  Home, FolderOpen, Receipt, ChevronLeft, ChevronRight, Pin, PinOff,
  UserCog, ClipboardList, CheckSquare, Layers, Workflow, ChevronDown, GitBranch,
  FileBarChart2, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/auth/AuthProvider'
import { useTenant } from '@/data/hooks/useTenant'
import { usePortalAcesso } from '@/data/hooks/usePortalAcesso'
import { podeAcessarModulo, podeAcessarSubModuloTarefas } from '@/auth/roles'
import type { ModuloEscritorio, SubModuloTarefas } from '@/domain/types'

type NavLink = {
  label: string
  href: string
  icon: React.ElementType
  modulo?: ModuloEscritorio
  submodulo?: SubModuloTarefas
}

type NavGroup = {
  isGroup: true
  label: string
  icon: React.ElementType
  modulo?: ModuloEscritorio
  children: NavLink[]
}

type NavEntry = NavLink | NavGroup

const PROCESSOS_HREFS = ['/escritorio/tarefas', '/escritorio/ocorrencias', '/escritorio/rotinas', '/escritorio/fluxos']

const escritorioNavBase: NavEntry[] = [
  { label: 'Dashboard', href: '/escritorio/dashboard', icon: LayoutDashboard },
  {
    isGroup: true,
    label: 'Processos',
    icon: Workflow,
    modulo: 'tarefas',
    children: [
      { label: 'Tarefas',     href: '/escritorio/tarefas',     icon: CheckSquare,  modulo: 'tarefas' },
      { label: 'Ocorrências', href: '/escritorio/ocorrencias', icon: Layers,       modulo: 'tarefas', submodulo: 'ocorrencias' },
      { label: 'Rotinas',     href: '/escritorio/rotinas',     icon: ClipboardList, modulo: 'tarefas', submodulo: 'rotinas' },
      { label: 'Modelo de fluxos', href: '/escritorio/fluxos', icon: GitBranch,    modulo: 'tarefas' },
    ],
  },
  { label: 'Clientes',      href: '/escritorio/clientes',      icon: Users,      modulo: 'clientes' },
  { label: 'Documentos',    href: '/escritorio/documentos',    icon: FolderOpen, modulo: 'documentos' },
  { label: 'Financeiro',    href: '/escritorio/financeiro',    icon: DollarSign,    modulo: 'financeiro' },
  { label: 'Guias e Recolhimentos', href: '/escritorio/guias', icon: FileBarChart2, modulo: 'financeiro' },
  { label: 'Configurações', href: '/escritorio/configuracoes', icon: Settings },
]

const clienteNavBase: { label: string; href: string; icon: React.ElementType; somenteResponsavel?: boolean }[] = [
  { label: 'Início',              href: '/portal/inicio',      icon: Home },
  { label: 'Documentos',          href: '/portal/documentos',  icon: FolderOpen },
  { label: 'Financeiro',          href: '/portal/financeiro',  icon: Receipt },
  { label: 'Guias e Recolhimentos', href: '/portal/guias',     icon: FileText },
  { label: 'Equipe',              href: '/portal/equipe',      icon: UserCog, somenteResponsavel: true },
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

  const grupoProcessosAtivo = PROCESSOS_HREFS.some(h => location.pathname.startsWith(h))
  const [processosAberto, setProcessosAberto] = useState(grupoProcessosAtivo)

  useEffect(() => {
    if (grupoProcessosAtivo) setProcessosAberto(true)
  }, [grupoProcessosAtivo])

  const nav: (NavLink | NavGroup)[] = isCliente
    ? clienteNavBase
        .filter((item) => {
          if (item.somenteResponsavel && papelPortal !== 'responsavel') return false
          if (!item.somenteResponsavel && item.href !== '/portal/inicio') {
            const secao = item.href.split('/').pop() as 'documentos' | 'financeiro' | 'guias'
            return secoesPermitidas.includes(secao)
          }
          return true
        })
        .map(({ label, href, icon }) => ({ label, href, icon }))
    : escritorioNavBase.reduce<(NavLink | NavGroup)[]>((acc, entry) => {
        if (!currentUser) return acc
        if ('isGroup' in entry) {
          if (entry.modulo && !podeAcessarModulo(currentUser, entry.modulo)) return acc
          const visibleChildren = entry.children.filter(child => {
            if (!child.modulo) return true
            if (!podeAcessarModulo(currentUser, child.modulo)) return false
            if (child.submodulo && !podeAcessarSubModuloTarefas(tenant, child.submodulo)) return false
            return true
          })
          if (visibleChildren.length === 0) return acc
          if (visibleChildren.length === 1) { acc.push(visibleChildren[0]); return acc }
          acc.push({ ...entry, children: visibleChildren })
        } else {
          const item = entry as NavLink
          if (!item.modulo) { acc.push(item); return acc }
          if (!podeAcessarModulo(currentUser, item.modulo)) return acc
          if (item.submodulo && !podeAcessarSubModuloTarefas(tenant, item.submodulo)) return acc
          acc.push(item)
        }
        return acc
      }, [])

  const [hoverExpanded, setHoverExpanded] = useState(false)

  const isExpanded = !collapsed || pinned
  const isHoverMode = collapsed && !pinned && hoverExpanded
  const showFull = isExpanded || isHoverMode
  const showProcessosOpen = processosAberto || isHoverMode

  function renderNavEntries(entries: (NavLink | NavGroup)[], mobile = false) {
    return entries.map((entry) => {
      if ('isGroup' in entry) {
        const grupoAtivo = entry.children.some(c => location.pathname.startsWith(c.href))
        const aberto = mobile ? processosAberto : showProcessosOpen
        return (
          <div key={entry.label}>
            <button
              onClick={() => setProcessosAberto(prev => !prev)}
              title={!showFull && !mobile ? entry.label : undefined}
              className={cn(
                'w-full flex items-center rounded-md text-sm font-medium transition-colors',
                showFull || mobile ? 'justify-between px-3' : 'justify-center p-2',
                mobile ? 'py-3 min-h-[44px]' : 'py-2',
                grupoAtivo
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <span className={cn('flex items-center', showFull || mobile ? 'gap-3' : '')}>
                <entry.icon className="h-5 w-5 shrink-0" />
                {(showFull || mobile) && entry.label}
              </span>
              {(showFull || mobile) && (
                <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200', aberto && 'rotate-180')} />
              )}
            </button>
            {(showFull || mobile) && aberto && (
              <div className="mt-0.5 space-y-0.5">
                {entry.children.map(child => {
                  const active = location.pathname.startsWith(child.href)
                  return (
                    <Link
                      key={child.href}
                      to={child.href}
                      onClick={mobile ? onCloseMobile : undefined}
                      className={cn(
                        'flex items-center gap-3 pl-9 pr-3 rounded-md text-sm font-medium transition-colors',
                        mobile ? 'py-2.5 min-h-[44px]' : 'py-1.5',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      <child.icon className="h-4 w-4 shrink-0" />
                      {child.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      }

      const item = entry as NavLink
      const active = location.pathname.startsWith(item.href)
      return (
        <Link
          key={item.href}
          to={item.href}
          onClick={mobile ? onCloseMobile : undefined}
          title={!showFull && !mobile ? item.label : undefined}
          className={cn(
            'flex items-center rounded-md text-sm font-medium transition-colors',
            showFull || mobile ? 'gap-3 px-3' : 'justify-center p-2',
            mobile ? 'py-3 min-h-[44px]' : 'py-2',
            active
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {(showFull || mobile) && item.label}
        </Link>
      )
    })
  }

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
            {renderNavEntries(nav)}
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
          {renderNavEntries(nav, true)}
        </nav>
      </aside>
    </>
  )
}
