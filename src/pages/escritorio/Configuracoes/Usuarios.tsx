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
import { Plus, Users, AlertTriangle, Eye, EyeOff, Pencil, UserX, UserCheck, X, Building2 } from 'lucide-react'
import type { User, UserRole, ModuloEscritorio, PapelPortalCliente, PortalSecao, ClienteAcesso } from '@/domain/types'
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

interface ClienteAcessoForm {
  client_id: string
  papel_portal: PapelPortalCliente
  secoes_portal: PortalSecao[]
}

interface FormState {
  nome: string
  email: string
  papel: UserRole
  senha_hash: string
  modulos: ModuloEscritorio[]
  // cliente: lista de empresas acessíveis
  clientes: ClienteAcessoForm[]
}

const defaultForm: FormState = {
  nome: '',
  email: '',
  papel: 'escritorio_colaborador',
  senha_hash: '',
  modulos: [],
  clientes: [],
}

function emptyAcesso(): ClienteAcessoForm {
  return { client_id: '', papel_portal: 'responsavel', secoes_portal: [] }
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

  function clienteNome(clientId: string) {
    const c = clients?.find((c) => c.id === clientId)
    return c ? (c.fantasia ?? c.razao_social) : '—'
  }

  function openCreate() {
    setEditTarget(null)
    setForm(defaultForm)
    setShowPassword(false)
    setDialogOpen(true)
  }

  function openEdit(u: User) {
    setEditTarget(u)
    // Normaliza: suporte a clientes[] novo E client_id legado
    let clientes: ClienteAcessoForm[] = []
    if (u.clientes?.length) {
      clientes = u.clientes.map(c => ({
        client_id: c.client_id,
        papel_portal: c.papel_portal,
        secoes_portal: c.secoes_portal ?? [],
      }))
    } else if (u.client_id) {
      clientes = [{
        client_id: u.client_id,
        papel_portal: u.papel_portal ?? 'responsavel',
        secoes_portal: u.secoes_portal ?? [],
      }]
    }
    setForm({
      nome: u.nome,
      email: u.email,
      papel: u.papel,
      senha_hash: '',
      modulos: u.modulos ?? [],
      clientes,
    })
    setShowPassword(false)
    setDialogOpen(true)
  }

  function addCliente() {
    setForm(f => ({ ...f, clientes: [...f.clientes, emptyAcesso()] }))
  }

  function removeCliente(idx: number) {
    setForm(f => ({ ...f, clientes: f.clientes.filter((_, i) => i !== idx) }))
  }

  function updateClienteField<K extends keyof ClienteAcessoForm>(
    idx: number, field: K, value: ClienteAcessoForm[K]
  ) {
    setForm(f => ({
      ...f,
      clientes: f.clientes.map((c, i) => i === idx ? { ...c, [field]: value } : c),
    }))
  }

  function toggleSecao(idx: number, secao: PortalSecao, checked: boolean) {
    setForm(f => ({
      ...f,
      clientes: f.clientes.map((c, i) =>
        i !== idx ? c : {
          ...c,
          secoes_portal: checked
            ? [...c.secoes_portal, secao]
            : c.secoes_portal.filter(s => s !== secao),
        }
      ),
    }))
  }

  const toggleModulo = (mod: ModuloEscritorio, checked: boolean) => {
    setForm((f) => ({
      ...f,
      modulos: checked ? [...f.modulos, mod] : f.modulos.filter((m) => m !== mod),
    }))
  }

  const selecionarTodosModulos = () => setForm((f) => ({ ...f, modulos: [...MODULOS_ESCRITORIO] }))
  const limparModulos = () => setForm((f) => ({ ...f, modulos: [] }))

  const handleSave = async () => {
    if (!form.nome.trim() || !form.email.trim()) return
    try {
      const permissoes =
        form.papel === 'escritorio_colaborador'
          ? { modulos: form.modulos.length > 0 ? form.modulos : undefined }
          : form.papel === 'cliente'
          ? {
              clientes: form.clientes
                .filter(c => c.client_id)
                .map<ClienteAcesso>(c => ({
                  client_id: c.client_id,
                  papel_portal: c.papel_portal,
                  ...(c.papel_portal === 'membro' && c.secoes_portal.length > 0
                    ? { secoes_portal: c.secoes_portal }
                    : {}),
                })),
              // limpa campos legados
              client_id: undefined,
              papel_portal: undefined,
              secoes_portal: undefined,
            }
          : {}

      if (editTarget) {
        await updateUser.mutateAsync({
          id: editTarget.id,
          data: {
            nome: form.nome.trim(),
            email: form.email.trim(),
            papel: form.papel,
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

  // Empresas que o usuário acessa (normalizado)
  function getEmpresasUsuario(u: User): string[] {
    if (u.clientes?.length) return u.clientes.map(c => c.client_id)
    if (u.client_id) return [u.client_id]
    return []
  }

  function semEmpresa(u: User) {
    return u.papel === 'cliente' && getEmpresasUsuario(u).length === 0
  }

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
                  {semEmpresa(u) && (
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
                {u.papel === 'cliente' && getEmpresasUsuario(u).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {getEmpresasUsuario(u).map(cid => (
                      <span key={cid} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        <Building2 className="h-3 w-3" />
                        {clienteNome(cid)}
                      </span>
                    ))}
                  </div>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90dvh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editTarget ? `Editar — ${editTarget.nome}` : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1 space-y-5 py-1">

            {/* Informações básicas */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Informações Básicas
              </p>
              <div className="space-y-3">
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

            {/* Papel e Acesso */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Papel e Acesso
              </p>

              <div className="space-y-1">
                <Label>Papel</Label>
                <Select
                  value={form.papel}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, papel: v as UserRole, modulos: [], clientes: [] }))
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

              {/* Módulos — colaborador */}
              {form.papel === 'escritorio_colaborador' && (
                <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Módulos liberados</Label>
                    <div className="flex gap-2">
                      <button type="button" onClick={selecionarTodosModulos} className="text-xs text-primary underline-offset-2 hover:underline">Todos</button>
                      <span className="text-xs text-muted-foreground">·</span>
                      <button type="button" onClick={limparModulos} className="text-xs text-muted-foreground underline-offset-2 hover:underline">Limpar</button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">Sem seleção = acesso a todos os módulos.</p>
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

              {/* Empresas — cliente */}
              {form.papel === 'cliente' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Empresas com acesso</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addCliente} className="h-7 text-xs gap-1">
                      <Plus className="h-3.5 w-3.5" /> Adicionar empresa
                    </Button>
                  </div>

                  {form.clientes.length === 0 && (
                    <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3 text-center">
                      Nenhuma empresa vinculada. Clique em "Adicionar empresa".
                    </p>
                  )}

                  <div className="space-y-3">
                    {form.clientes.map((acesso, idx) => {
                      const jaUsados = form.clientes
                        .map((c, i) => i !== idx ? c.client_id : null)
                        .filter(Boolean) as string[]

                      return (
                        <div key={idx} className="rounded-md border p-3 space-y-3 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Empresa {idx + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeCliente(idx)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Empresa</Label>
                            <Select
                              value={acesso.client_id}
                              onValueChange={(v) => updateClienteField(idx, 'client_id', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {clients?.filter(c => !jaUsados.includes(c.id)).map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.fantasia ?? c.razao_social}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Papel no portal</Label>
                            <Select
                              value={acesso.papel_portal}
                              onValueChange={(v) => {
                                updateClienteField(idx, 'papel_portal', v as PapelPortalCliente)
                                if (v === 'responsavel') updateClienteField(idx, 'secoes_portal', [])
                              }}
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

                          {acesso.papel_portal === 'membro' && (
                            <div className="space-y-2 rounded border p-2 bg-background">
                              <Label className="text-xs">Seções liberadas</Label>
                              <p className="text-xs text-muted-foreground -mt-1">Sem seleção = todas as seções.</p>
                              <div className="flex flex-col gap-1.5">
                                {SECOES_PORTAL.map(({ secao, label }) => (
                                  <div key={secao} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`secao-${idx}-${secao}`}
                                      checked={acesso.secoes_portal.includes(secao)}
                                      onCheckedChange={(checked) => toggleSecao(idx, secao, !!checked)}
                                    />
                                    <label htmlFor={`secao-${idx}-${secao}`} className="text-xs cursor-pointer select-none">
                                      {label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t" />

            {/* Senha */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Senha</p>
              <div className="space-y-1">
                <Label htmlFor="u-senha">{editTarget ? 'Nova senha' : 'Senha inicial'}</Label>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
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
