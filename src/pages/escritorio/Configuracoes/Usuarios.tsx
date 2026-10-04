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
import { Plus, Users, AlertTriangle, Eye, EyeOff, Pencil, UserX, UserCheck } from 'lucide-react'
import type { User, UserRole, ModuloEscritorio, PapelPortalCliente, PortalSecao } from '@/domain/types'
import { MODULOS_ESCRITORIO, moduloLabels } from '@/auth/roles'
import { v4 as uuidv4 } from 'uuid'

const papelLabels: Record<UserRole, string> = {
  escritorio_admin: 'Admin',
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
  { secao: 'guias',      label: 'Guias e Recolhimentos' },
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

function UserAvatar({ nome }: { nome: string }) {
  const initials = nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0 select-none">
      {initials || '?'}
    </div>
  )
}

function ModulosBadges({ modulos }: { modulos?: ModuloEscritorio[] }) {
  if (!modulos || modulos.length === 0) {
    return <span className="text-xs text-muted-foreground italic">Todos os módulos</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {modulos.map((m) => (
        <Badge key={m} variant="outline" className="text-xs py-0 px-1.5 h-4">
          {moduloLabels[m]}
        </Badge>
      ))}
    </div>
  )
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
  const [showPassword, setShowPassword] = useState(false)

  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setShowPassword(false)
    setDialogOpen(true)
  }

  const openEdit = (u: User) => {
    setEditTarget(u)
    setForm({
      nome: u.nome,
      email: u.email,
      papel: u.papel,
      client_id: u.client_id ?? '',
      senha_hash: '',
      modulos: u.modulos ?? [],
      papel_portal: u.papel_portal ?? 'responsavel',
      secoes_portal: u.secoes_portal ?? [],
    })
    setShowPassword(false)
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
        toast({ title: 'Usuário atualizado com sucesso' })
      } else {
        const senhaInicial = form.senha_hash.trim() || 'senha123'
        const novo: User = {
          id: uuidv4(),
          tenant_id: tenantId,
          nome: form.nome.trim(),
          email: form.email.trim(),
          papel: form.papel,
          client_id: form.papel === 'cliente' ? form.client_id : undefined,
          ativo: true,
          senha_hash: senhaInicial,
          ...permissoes,
        }
        await createUser.mutateAsync(novo)
        toast({ title: 'Usuário criado', description: `Senha inicial: ${senhaInicial}` })
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

  const toggleModulo = (mod: ModuloEscritorio, checked: boolean) => {
    setForm((f) => ({
      ...f,
      modulos: checked ? [...f.modulos, mod] : f.modulos.filter((m) => m !== mod),
    }))
  }

  const selecionarTodosModulos = () => setForm((f) => ({ ...f, modulos: [...MODULOS_ESCRITORIO] }))
  const limparModulos = () => setForm((f) => ({ ...f, modulos: [] }))

  const clienteNome = (clientId: string) =>
    clients?.find((c) => c.id === clientId)?.razao_social ?? '—'

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Usuários</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os usuários do escritório e do portal do cliente.
          </p>
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
              className={`rounded-lg border bg-card px-4 py-3 flex flex-wrap items-start gap-3 ${!u.ativo ? 'opacity-60' : ''}`}
            >
              <UserAvatar nome={u.nome} />

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-sm leading-tight">{u.nome}</p>
                  {u.papel === 'cliente' && !u.client_id && (
                    <span title="Sem empresa vinculada">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    </span>
                  )}
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
                <p className="text-xs text-muted-foreground">{u.email}</p>
                {u.papel === 'escritorio_colaborador' && (
                  <div className="pt-0.5">
                    <ModulosBadges modulos={u.modulos} />
                  </div>
                )}
                {u.papel === 'cliente' && u.client_id && (
                  <p className="text-xs text-muted-foreground pt-0.5">
                    Empresa: {clienteNome(u.client_id)}
                    {u.papel_portal && (
                      <span className="ml-2 capitalize">· {u.papel_portal === 'responsavel' ? 'Responsável' : 'Membro'}</span>
                    )}
                  </p>
                )}
              </div>

              <PermissionGuard permission="manageUsers">
                <div className="flex items-center gap-1 shrink-0 self-start">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${u.ativo ? 'text-destructive hover:text-destructive' : 'text-green-600 hover:text-green-600'}`}
                    onClick={() => handleToggleAtivo(u)}
                    disabled={u.id === currentUser?.id}
                    title={u.ativo ? 'Desativar' : 'Reativar'}
                  >
                    {u.ativo ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </PermissionGuard>
            </div>
          ))}
        </div>
      )}

      {/* Formulário unificado: mesmo para criar e editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90dvh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editTarget ? `Editar — ${editTarget.nome}` : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1 space-y-5 py-1">

            {/* Seção: Informações básicas */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Informações Básicas
              </p>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="u-nome">Nome completo</Label>
                  <Input
                    id="u-nome"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex.: Maria Silva"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="u-email">E-mail</Label>
                  <Input
                    id="u-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* Seção: Papel e acesso */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Papel e Acesso
              </p>

              <div className="space-y-1">
                <Label>Papel</Label>
                <Select
                  value={form.papel}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, papel: v as UserRole, modulos: [], secoes_portal: [] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="escritorio_admin">Admin Escritório</SelectItem>
                    <SelectItem value="escritorio_colaborador">Colaborador</SelectItem>
                    <SelectItem value="cliente">Cliente (portal)</SelectItem>
                  </SelectContent>
                </Select>
                {form.papel === 'escritorio_admin' && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Admin tem acesso irrestrito a todos os módulos e configurações.
                  </p>
                )}
              </div>

              {/* Módulos — só para colaborador */}
              {form.papel === 'escritorio_colaborador' && (
                <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Módulos liberados</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selecionarTodosModulos}
                        className="text-xs text-primary underline-offset-2 hover:underline"
                      >
                        Todos
                      </button>
                      <span className="text-xs text-muted-foreground">·</span>
                      <button
                        type="button"
                        onClick={limparModulos}
                        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Sem seleção = acesso a todos os módulos.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {MODULOS_ESCRITORIO.map((mod) => (
                      <div key={mod} className="flex items-center gap-2">
                        <Checkbox
                          id={`mod-${mod}`}
                          checked={form.modulos.includes(mod)}
                          onCheckedChange={(checked) => toggleModulo(mod, !!checked)}
                        />
                        <label htmlFor={`mod-${mod}`} className="text-sm cursor-pointer select-none">
                          {moduloLabels[mod]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vinculação de cliente */}
              {form.papel === 'cliente' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Empresa vinculada</Label>
                    <Select
                      value={form.client_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa..." />
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

                  <div className="space-y-1">
                    <Label>Papel no portal</Label>
                    <Select
                      value={form.papel_portal}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, papel_portal: v as PapelPortalCliente, secoes_portal: [] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="responsavel">Responsável (acesso total)</SelectItem>
                        <SelectItem value="membro">Membro (acesso restrito)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.papel_portal === 'membro' && (
                    <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                      <Label className="text-sm">Seções liberadas no portal</Label>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Sem seleção = acesso a todas as seções.
                      </p>
                      <div className="flex flex-col gap-2 pt-1">
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
                </div>
              )}
            </div>

            <div className="border-t" />

            {/* Seção: Senha */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Senha
              </p>
              <div className="space-y-1">
                <Label htmlFor="u-senha">
                  {editTarget ? 'Nova senha' : 'Senha inicial'}
                </Label>
                <div className="relative">
                  <Input
                    id="u-senha"
                    type={showPassword ? 'text' : 'password'}
                    value={form.senha_hash}
                    onChange={(e) => setForm((f) => ({ ...f, senha_hash: e.target.value }))}
                    placeholder={editTarget ? 'Deixe em branco para não alterar' : 'senha123'}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!editTarget && (
                  <p className="text-xs text-muted-foreground">
                    Padrão: <code className="font-mono">senha123</code> se não informada.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.nome.trim() || !form.email.trim()}
            >
              {editTarget ? 'Salvar alterações' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
