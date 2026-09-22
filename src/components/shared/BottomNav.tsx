import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CheckSquare, DollarSign, Menu,
  Home, FolderOpen, Receipt, UserCog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/auth/AuthProvider'
import { usePortalAcesso } from '@/data/hooks/usePortalAcesso'
import { podeAcessarModulo } from '@/auth/roles'
import type { ModuloEscritorio } from '@/domain/types'

interface BottomNavProps {
  onOpenMenu: () => void
}

const escritorioItems: { label: string; href: string; icon: React.ElementType; modulo?: ModuloEscritorio }[] = [
  { label: 'Início', href: '/escritorio/dashboard', icon: LayoutDashboard },
  { label: 'Clientes', href: '/escritorio/clientes', icon: Users, modulo: 'clientes' },
  { label: 'Tarefas', href: '/escritorio/tarefas', icon: CheckSquare, modulo: 'tarefas' },
  { label: 'Financeiro', href: '/escritorio/financeiro', icon: DollarSign, modulo: 'financeiro' },
]

const portalItemsBase: { label: string; href: string; icon: React.ElementType; somenteResponsavel?: boolean }[] = [
  { label: 'Início', href: '/portal/inicio', icon: Home },
  { label: 'Documentos', href: '/portal/documentos', icon: FolderOpen },
  { label: 'Financeiro', href: '/portal/financeiro', icon: Receipt },
  { label: 'Equipe', href: '/portal/equipe', icon: UserCog, somenteResponsavel: true },
]

export function BottomNav({ onOpenMenu }: BottomNavProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { secoesPermitidas, papelPortal } = usePortalAcesso()
  const isCliente = currentUser?.papel === 'cliente'

  if (!currentUser) return null

  const items = isCliente
    ? portalItemsBase.filter((item) => {
        if (item.somenteResponsavel && papelPortal !== 'responsavel') return false
        if (!item.somenteResponsavel && item.href !== '/portal/inicio') {
          const secao = item.href.split('/').pop() as 'documentos' | 'financeiro'
          return secoesPermitidas.includes(secao)
        }
        return true
      })
    : escritorioItems.filter((item) => {
        if (!item.modulo) return true
        return podeAcessarModulo(currentUser, item.modulo)
      })

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-16">
        {items.map((item) => {
          const active = location.pathname.startsWith(item.href)
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn('p-1.5 rounded-full transition-colors', active && 'bg-primary/10')}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium truncate w-full text-center leading-none">
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
            <span className="text-[10px] font-medium truncate w-full text-center leading-none">Mais</span>
          </button>
        )}
      </div>
    </nav>
  )
}
