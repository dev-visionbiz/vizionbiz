import { useAuth } from '@/auth/AuthProvider'
import { useClient } from '@/data/hooks/useClients'
import { useTheme } from '@/theme/ThemeProvider'
import { Moon, Sun, ChevronDown, User, Menu, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'

const ROLE_LABELS: Record<string, string> = {
  escritorio_admin: 'Admin',
  escritorio_colaborador: 'Colaborador',
  cliente: 'Cliente',
}

interface HeaderProps {
  onMenuToggle: () => void
  pageTitle?: string
}

export function Header({ onMenuToggle, pageTitle }: HeaderProps) {
  const { currentUser, allUsers, switchUser, logout } = useAuth()
  const navigate = useNavigate()
  const isCliente = currentUser?.papel === 'cliente'
  const { data: clienteEmpresa } = useClient(isCliente ? (currentUser?.client_id ?? '') : '')
  const { isDark, toggleDarkMode } = useTheme()

  const nomeEmpresaCliente = clienteEmpresa?.fantasia ?? clienteEmpresa?.razao_social

  return (
    <header className="h-14 border-b bg-card flex items-center px-4 gap-3 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        onClick={onMenuToggle}
        aria-label="Abrir menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <div className="flex-1 min-w-0 flex items-center gap-3">
        {isCliente && nomeEmpresaCliente && (
          <span className="text-sm font-medium truncate">{nomeEmpresaCliente}</span>
        )}
        {!isCliente && pageTitle && (
          <span className="text-sm font-semibold truncate lg:hidden">{pageTitle}</span>
        )}
      </div>

      <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <User className="h-4 w-4" />
            <span className="max-w-[100px] truncate hidden sm:inline">{currentUser?.nome}</span>
            <span className="text-xs text-muted-foreground hidden md:inline">
              ({currentUser ? ROLE_LABELS[currentUser.papel] : ''})
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Trocar Perfil (Teste)</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allUsers.map((user) => (
            <DropdownMenuItem
              key={user.id}
              onClick={() => switchUser(user.id)}
              className={currentUser?.id === user.id ? 'bg-accent' : ''}
            >
              <div className="flex flex-col">
                <span className="font-medium">{user.nome}</span>
                <span className="text-xs text-muted-foreground">
                  {user.email} · {ROLE_LABELS[user.papel]}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => { logout(); navigate('/login', { replace: true }) }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
