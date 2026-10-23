import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { BookOpen, Building2, LayoutDashboard, LogOut, Puzzle, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'

export function AdminLayout() {
  const { currentUser, logout } = useAuth()

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-60 shrink-0 flex flex-col border-r bg-card">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">VisionBiz</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <NavLink
            to="/admin/tenants"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4" />
            Escritórios
          </NavLink>
          <NavLink
            to="/admin/comissoes"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <TrendingUp className="h-4 w-4" />
            Comissões
          </NavLink>
          <NavLink
            to="/admin/catalogo"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <Puzzle className="h-4 w-4" />
            Extensores
          </NavLink>
          <NavLink
            to="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className={() =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground`
            }
          >
            <BookOpen className="h-4 w-4" />
            Documentação Dev
          </NavLink>
        </nav>

        <div className="p-3 border-t">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground mb-1">
            <span className="truncate">{currentUser?.nome}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>

      <Toaster />
    </div>
  )
}
