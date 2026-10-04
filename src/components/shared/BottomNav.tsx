import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Menu,
  Home, FolderOpen, Receipt, UserCog, FileText,
  Layers, Workflow, ClipboardList, CheckSquare, X, GitBranch, FileBarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/auth/AuthProvider'
import { useTenant } from '@/data/hooks/useTenant'
import { usePortalAcesso } from '@/data/hooks/usePortalAcesso'
import { podeAcessarModulo, podeAcessarSubModuloTarefas } from '@/auth/roles'
import type { ModuloEscritorio, SubModuloTarefas } from '@/domain/types'

interface BottomNavProps {
  onOpenMenu: () => void
}

const PROCESSOS_ITEMS: { label: string; href: string; icon: React.ElementType; submodulo?: SubModuloTarefas }[] = [
  { label: 'Tarefas',     href: '/escritorio/tarefas',     icon: CheckSquare },
  { label: 'Ocorrências', href: '/escritorio/ocorrencias', icon: Layers,       submodulo: 'ocorrencias' },
  { label: 'Rotinas',     href: '/escritorio/rotinas',     icon: ClipboardList, submodulo: 'rotinas' },
  { label: 'Modelo de fluxos', href: '/escritorio/fluxos', icon: GitBranch },
]

const PROCESSOS_HREFS = PROCESSOS_ITEMS.map(i => i.href)

const escritorioItems: { label: string; href: string; icon: React.ElementType; modulo?: ModuloEscritorio; isProcessos?: true }[] = [
  { label: 'Início',    href: '/escritorio/dashboard', icon: LayoutDashboard },
  { label: 'Processos', href: '',                      icon: Workflow,        modulo: 'tarefas', isProcessos: true },
  { label: 'Clientes',  href: '/escritorio/clientes',  icon: Users,           modulo: 'clientes' },
  { label: 'Guias',     href: '/escritorio/guias',     icon: FileBarChart2,   modulo: 'financeiro' },
]

const portalItemsBase: { label: string; href: string; icon: React.ElementType; somenteResponsavel?: boolean }[] = [
  { label: 'Início',     href: '/portal/inicio',     icon: Home },
  { label: 'Documentos', href: '/portal/documentos', icon: FolderOpen },
  { label: 'Financeiro', href: '/portal/financeiro', icon: Receipt },
  { label: 'Guias',      href: '/portal/guias',      icon: FileText },
  { label: 'Equipe',     href: '/portal/equipe',     icon: UserCog, somenteResponsavel: true },
]

export function BottomNav({ onOpenMenu }: BottomNavProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { data: tenant } = useTenant(currentUser?.tenant_id ?? '')
  const { secoesPermitidas, papelPortal } = usePortalAcesso()
  const isCliente = currentUser?.papel === 'cliente'
  const [processosOpen, setProcessosOpen] = useState(false)

  if (!currentUser) return null

  const grupoProcessosAtivo = PROCESSOS_HREFS.some(h => location.pathname.startsWith(h))
  const activeProcessosItem = PROCESSOS_ITEMS.find(i => location.pathname.startsWith(i.href))

  const processosVisiveis = PROCESSOS_ITEMS.filter(item =>
    !item.submodulo || podeAcessarSubModuloTarefas(tenant, item.submodulo)
  )

  const items = isCliente
    ? portalItemsBase.filter((item) => {
        if (item.somenteResponsavel && papelPortal !== 'responsavel') return false
        if (!item.somenteResponsavel && item.href !== '/portal/inicio') {
          const secao = item.href.split('/').pop() as 'documentos' | 'financeiro' | 'guias'
          return secoesPermitidas.includes(secao)
        }
        return true
      })
    : escritorioItems.filter((item) => {
        if (!item.modulo) return true
        return podeAcessarModulo(currentUser, item.modulo)
      })

  return (
    <>
      {processosOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setProcessosOpen(false)}
        />
      )}

      {!isCliente && (
        <div
          className={cn(
            'fixed left-0 right-0 z-50 bg-card border border-b-0 rounded-t-2xl shadow-xl lg:hidden transition-transform duration-200',
            processosOpen ? 'translate-y-0' : 'translate-y-full',
          )}
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold">Processos</span>
            <button
              onClick={() => setProcessosOpen(false)}
              className="p-1.5 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {processosVisiveis.map(item => {
            const active = location.pathname.startsWith(item.href)
            return (
              <button
                key={item.href}
                onClick={() => { navigate(item.href); setProcessosOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-4 text-sm font-medium transition-colors',
                  active
                    ? 'text-primary bg-primary/5'
                    : 'text-foreground hover:bg-accent',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <span className="h-2 w-2 rounded-full bg-primary" />}
              </button>
            )
          })}
          <div className="h-2" />
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch h-16">
          {items.map((item) => {
            if ('isProcessos' in item && item.isProcessos) {
              return (
                <button
                  key="processos"
                  onClick={() => setProcessosOpen(prev => !prev)}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 transition-colors',
                    grupoProcessosAtivo || processosOpen ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <div className={cn('p-1.5 rounded-full transition-colors', (grupoProcessosAtivo || processosOpen) && 'bg-primary/10')}>
                    <Workflow className="h-5 w-5" />
                  </div>
                  <span className="text-[0.625rem] font-medium truncate w-full text-center leading-none">
                    {activeProcessosItem ? activeProcessosItem.label : 'Processos'}
                  </span>
                </button>
              )
            }
            const active = location.pathname.startsWith(item.href)
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <div className={cn('p-1.5 rounded-full transition-colors', active && 'bg-primary/10')}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-[0.625rem] font-medium truncate w-full text-center leading-none">
                  {item.label}
                </span>
              </button>
            )
          })}
          {!isCliente && (
            <button
              onClick={onOpenMenu}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="p-1.5 rounded-full">
                <Menu className="h-5 w-5" />
              </div>
              <span className="text-[0.625rem] font-medium truncate w-full text-center leading-none">Mais</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
