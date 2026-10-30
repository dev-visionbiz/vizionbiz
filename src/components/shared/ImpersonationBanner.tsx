import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Building2, LogOut, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ImpersonationBanner() {
  const {
    isImpersonating, currentTenant, exitImpersonation,
    isImpersonatingUser, currentUser, exitUserImpersonation,
  } = useAuth()
  const navigate = useNavigate()

  if (isImpersonatingUser) {
    async function handleExitUser() {
      await exitUserImpersonation()
      navigate('/escritorio/configuracoes/usuarios', { replace: true })
    }

    return (
      <div className="flex items-center justify-between px-4 py-2 bg-violet-500 text-white text-sm font-medium shrink-0">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4" />
          <span>
            Visualizando como: <strong>{currentUser?.nome ?? 'usuário'}</strong>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-white hover:bg-violet-600 hover:text-white"
          onClick={handleExitUser}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair do perfil
        </Button>
      </div>
    )
  }

  if (!isImpersonating) return null

  async function handleExit() {
    await exitImpersonation()
    navigate('/admin/tenants', { replace: true })
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-amber-500 text-amber-950 text-sm font-medium shrink-0">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        <span>
          VisionBiz Admin — acessando: <strong>{currentTenant?.nome ?? 'escritório'}</strong>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
        onClick={handleExit}
      >
        <LogOut className="h-3.5 w-3.5" />
        Sair do escritório
      </Button>
    </div>
  )
}
