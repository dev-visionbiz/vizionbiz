import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useUsers, useUpdateUser } from '@/data/hooks/useUsers'
import { usePortalAcesso } from '@/data/hooks/usePortalAcesso'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { PortalSecao } from '@/domain/types'

const SECOES: { secao: PortalSecao; label: string }[] = [
  { secao: 'documentos', label: 'Documentos' },
  { secao: 'financeiro', label: 'Financeiro' },
]

export default function PortalEquipe() {
  const { currentUser } = useAuth()
  const { papelPortal } = usePortalAcesso()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: allUsers, isLoading } = useUsers(tenantId, true)
  const updateUser = useUpdateUser()
  const { toast } = useToast()

  if (papelPortal !== 'responsavel') {
    return <Navigate to="/portal/inicio" replace />
  }

  if (isLoading) return <PageLoader />

  const membros = allUsers?.filter(
    (u) => u.client_id === currentUser?.client_id && u.papel === 'cliente' && u.id !== currentUser?.id,
  ) ?? []

  const toggleSecao = async (userId: string, secaoAtual: PortalSecao[], secao: PortalSecao) => {
    const updated = secaoAtual.includes(secao)
      ? secaoAtual.filter((s) => s !== secao)
      : [...secaoAtual, secao]
    try {
      await updateUser.mutateAsync({ id: userId, data: { secoes_portal: updated.length > 0 ? updated : undefined } })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Equipe</h1>
        <p className="text-sm text-muted-foreground">Gerencie o acesso dos membros da sua empresa ao portal.</p>
      </div>

      {membros.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum outro usuário vinculado à sua empresa.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {membros.map((u) => {
            const secoesAtuais: PortalSecao[] = u.secoes_portal ?? []
            const isMembro = u.papel_portal === 'membro'
            return (
              <div key={u.id} className={`rounded-lg border bg-card px-4 py-3 space-y-3 ${!u.ativo ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm flex-1 truncate">{u.nome}</span>
                  <Badge variant={isMembro ? 'secondary' : 'outline'} className="text-xs shrink-0">
                    {isMembro ? 'Membro' : 'Responsável'}
                  </Badge>
                  {!u.ativo && <Badge variant="secondary" className="text-xs shrink-0">Inativo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                {isMembro && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Seções liberadas</p>
                    <div className="flex gap-4">
                      {SECOES.map(({ secao, label }) => (
                        <div key={secao} className="flex items-center gap-1.5">
                          <Checkbox
                            id={`${u.id}-${secao}`}
                            checked={secoesAtuais.length === 0 || secoesAtuais.includes(secao)}
                            disabled={!u.ativo}
                            onCheckedChange={() => {
                              const base = secoesAtuais.length === 0 ? ['documentos', 'financeiro'] as PortalSecao[] : secoesAtuais
                              toggleSecao(u.id, base, secao)
                            }}
                          />
                          <label
                            htmlFor={`${u.id}-${secao}`}
                            className="text-sm cursor-pointer select-none"
                          >
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                    {secoesAtuais.length === 0 && (
                      <p className="text-xs text-muted-foreground">Acesso a todas as seções.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
