import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { PermissionGuard } from '@/auth/PermissionGuard'
import { useUsers, useCreateUser, useUpdateUser, useDeactivateUser, useActivateUser } from '@/data/hooks/useUsers'
import { useClients } from '@/data/hooks/useClients'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Users, AlertTriangle } from 'lucide-react'
import type { User, UserRole, ModuloEscritorio, PapelPortalCliente, PortalSecao } from '@/domain/types'
import { MODULOS_ESCRITORIO, moduloLabels } from '@/auth/roles'
import { v4 as uuidv4 } from 'uuid'

const papelLabels: Record<UserRole, string> = {
  escritorio_admin: 'Admin Escritório',
  escritorio_colaborador: 'Colaborador',
  cliente: 'Cliente',
}

const papelVariant: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  escritorio_admin: 'default',
  escritorio_colaborador: 'secondary',
  cliente: 'outline',
}

const SECOES_PORTAL: { secao: PortalSecao; label: string }[] = [
  { secao: 'documentos', label: 'Documentos' },
  { secao: 'financeiro', label: 'Financeiro' },
]

interface FormState {
  nome: string
  email: string
  papel: UserRole
  client_id: string
  senha_hash: string
  modulos: ModuloEscritorio[]
  papel_portal: PapelPortalCliente
  secoes_portal: PortalSecao[]
}

const defaultForm: FormState = {
  nome: '',
  email: '',
  papel: 'escritorio_colaborador',
  client_id: '',
  senha_hash: '',
  modulos: [],
  papel_portal: 'responsavel',
  secoes_portal: [],
}

export default function Usuarios() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: users, isLoading } = useUsers(tenantId, true)
  const { data: clients } = useClients(tenantId)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deactivateUser = useDeactivateUser()
  const activateUser = useActivateUser()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)

  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  const openEdit = (u: User) => {
    setEditTarget(u)
    setForm({
      nome: u.nome,
      email: u.email,
      papel: u.papel,
      client_id: u.client_id ?? '',
      senha_hash: u.senha_hash ?? '',
      modulos: u.modulos ?? [],
      papel_portal: u.papel_portal ?? 'responsavel',
      secoes_portal: u.secoes_portal ?? [],
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.nome.trim() || !form.email.trim()) return
    try {
      const permissoes =
        form.papel === 'escritorio_colaborador'
          ? { modulos: form.modulos.length > 0 ? form.modulos : undefined }
          : form.papel === 'cliente'
          ? {
              papel_portal: form.papel_portal,
              secoes_portal:
                form.papel_portal === 'membro' && form.secoes_portal.length > 0
                  ? form.secoes_portal
                  : undefined,
            }
          : {}

      if (editTarget) {
        await updateUser.mutateAsync({
          id: editTarget.id,
          data: {
            nome: form.nome.trim(),
            email: form.email.trim(),
            papel: form.papel,
            client_id: form.papel === 'cliente' ? form.client_id : undefined,
            ...(form.senha_hash.trim() ? { senha_hash: form.senha_hash.trim() } : {}),
            ...permissoes,
          },
        })
        toast({ title: 'Usuário atualizado' })
      } else {
        const novo: User = {
          id: uuidv4(),
          tenant_id: tenantId,
          nome: form.nome.trim(),
          email: form.email.trim(),
          papel: form.papel,
          client_id: form.papel === 'cliente' ? form.client_id : undefined,
          ativo: true,
          senha_hash: form.senha_hash.trim() || 'senha123',
          ...permissoes,
        }
        await createUser.mutateAsync(novo)
        toast({ title: 'Usuário criado', description: `Senha inicial: ${novo.senha_hash}` })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    }
  }

  const handleToggleAtivo = async (u: User) => {
    if (u.id === currentUser?.id) {
      toast({ title: 'Ação bloqueada', description: 'Você não pode desativar sua própria conta.', variant: 'destructive' })
      return
    }
    try {
      if (u.ativo) {
        await deactivateUser.mutateAsync(u.id)
        toast({ title: 'Usuário desativado' })
      } else {
        await activateUser.mutateAsync(u.id)
        toast({ title: 'Usuário reativado' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível alterar o status.', variant: 'destructive' })
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Usuários</h3>
          <p className="text-sm text-muted-foreground">Gerencie os usuários do escritório e do portal do cliente.</p>
        </div>
        <PermissionGuard permission="manageUsers">
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Novo Usuário
          </Button>
        </PermissionGuard>
      </div>

      {!users?.length ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário"
          description="Crie usuários para dar acesso ao sistema."
          action={
            <PermissionGuard permission="manageUsers">
              <Button onClick={openCreate}>Novo Usuário</Button>
            </PermissionGuard>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <div
              key={u.id}
              className={`rounded-lg border bg-card px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 ${!u.ativo ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-48">
                <p className="font-semibold text-sm">{u.nome}</p>
                {u.papel === 'cliente' && !u.client_id && (
                  <span title="Sem empresa vinculada">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{u.email}</span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={papelVariant[u.papel]} className="text-xs">
                  {papelLabels[u.papel]}
                </Badge>
                <Badge
                  variant={u.ativo ? 'outline' : 'secondary'}
                  className={`text-xs ${u.ativo ? 'border-green-500 text-green-600' : ''}`}
                >
                  {u.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <PermissionGuard permission="manageUsers">
                <div className="flex items-center gap-1 ml-auto shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                    Editar
                  </Button>
                  <Button
                    variant={u.ativo ? 'ghost' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleAtivo(u)}
                    disabled={u.id === currentUser?.id}
                    className={u.ativo ? 'text-destructive hover:text-destructive' : ''}
                  >
                    {u.ativo ? 'Desativar' : 'Reativar'}
                  </Button>
                </div>
              </PermissionGuard>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md flex flex-col max-h-[90dvh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editTarget ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            <div className="space-y-1">
              <Label htmlFor="u-nome">Nome</Label>
              <Input
                id="u-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Papel</Label>
              <Select
                value={form.papel}
                onValueChange={(v) => setForm((f) => ({ ...f, papel: v as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="escritorio_admin">Admin Escritório</SelectItem>
                  <SelectItem value="escritorio_colaborador">Colaborador</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.papel === 'escritorio_colaborador' && (
              <div className="space-y-2">
                <Label>Módulos de acesso</Label>
                <p className="text-xs text-muted-foreground">Sem seleção = acesso total.</p>
                <div className="grid grid-cols-2 gap-2">
                  {MODULOS_ESCRITORIO.map((mod) => (
                    <div key={mod} className="flex items-center gap-2">
                      <Checkbox
                        id={`mod-${mod}`}
                        checked={form.modulos.includes(mod)}
                        onCheckedChange={(checked) =>
                          setForm((f) => ({
                            ...f,
                            modulos: checked
                              ? [...f.modulos, mod]
                              : f.modulos.filter((m) => m !== mod),
                          }))
                        }
                      />
                      <label htmlFor={`mod-${mod}`} className="text-sm cursor-pointer select-none">
                        {moduloLabels[mod]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {form.papel === 'cliente' && (
              <div className="space-y-1">
                <Label>Cliente Vinculado</Label>
                <Select
                  value={form.client_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.papel === 'cliente' && (
              <div className="space-y-1">
                <Label>Papel no Portal</Label>
                <Select
                  value={form.papel_portal}
                  onValueChange={(v) => setForm((f) => ({ ...f, papel_portal: v as PapelPortalCliente }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responsavel">Responsável</SelectItem>
                    <SelectItem value="membro">Membro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.papel === 'cliente' && form.papel_portal === 'membro' && (
              <div className="space-y-2">
                <Label>Seções do Portal</Label>
                <p className="text-xs text-muted-foreground">Sem seleção = acesso a todas as seções.</p>
                <div className="flex flex-col gap-2">
                  {SECOES_PORTAL.map(({ secao, label }) => (
                    <div key={secao} className="flex items-center gap-2">
                      <Checkbox
                        id={`secao-${secao}`}
                        checked={form.secoes_portal.includes(secao)}
                        onCheckedChange={(checked) =>
                          setForm((f) => ({
                            ...f,
                            secoes_portal: checked
                              ? [...f.secoes_portal, secao]
                              : f.secoes_portal.filter((s) => s !== secao),
                          }))
                        }
                      />
                      <label htmlFor={`secao-${secao}`} className="text-sm cursor-pointer select-none">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="u-senha">
                {editTarget ? 'Nova Senha (deixe em branco para manter)' : 'Senha inicial'}
              </Label>
              <Input
                id="u-senha"
                type="text"
                value={form.senha_hash}
                onChange={(e) => setForm((f) => ({ ...f, senha_hash: e.target.value }))}
                placeholder={editTarget ? 'sem alteração' : 'senha123'}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 pt-2 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!form.nome.trim() || !form.email.trim()}
            >
              {editTarget ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
