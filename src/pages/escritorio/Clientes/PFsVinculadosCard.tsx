import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, UserCheck, UserPlus } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { Client, PapelPessoa } from '@/domain/types'
import {
  usePFsDeEmpresa,
  useCreateClientVinculo,
  useUpdateClientVinculo,
  useDeleteClientVinculo,
  type PFComVinculo,
} from '@/data/hooks/useClientVinculos'
import { useClients, useCreateClient } from '@/data/hooks/useClients'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatCPF } from '@/lib/utils'

const PAPEL_LABELS: Record<PapelPessoa, string> = {
  socio: 'Sócio',
  administrador: 'Administrador',
  procurador: 'Procurador',
  contato_financeiro: 'Contato Financeiro',
  contato_principal: 'Contato Principal',
}

type BuscaState = 'idle' | 'encontrado' | 'ja_vinculado' | 'multiplos' | 'nao_encontrado'

interface Props {
  tenantId: string
  clientId: string
}

export function PFsVinculadosCard({ tenantId, clientId }: Props) {
  const { toast } = useToast()
  const { data: pfsVinculados = [] } = usePFsDeEmpresa(tenantId, clientId)
  const { data: todosClientes = [] } = useClients(tenantId)

  const createVinculo = useCreateClientVinculo()
  const updateVinculo = useUpdateClientVinculo()
  const deleteVinculo = useDeleteClientVinculo()
  const createClient = useCreateClient()

  // Dialog add
  const [addOpen, setAddOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [buscaState, setBuscaState] = useState<BuscaState>('idle')
  const [clienteEncontrado, setClienteEncontrado] = useState<Client | null>(null)
  const [candidatos, setCandidatos] = useState<Client[]>([])
  const [addPapel, setAddPapel] = useState<PapelPessoa>('socio')
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [novoEmail, setNovoEmail] = useState('')

  // Dialog edit
  const [editTarget, setEditTarget] = useState<PFComVinculo | null>(null)
  const [editPapel, setEditPapel] = useState<PapelPessoa>('socio')
  const [editPrincipal, setEditPrincipal] = useState(false)

  const vinculadosIds = new Set(pfsVinculados.map((v) => v.client_pf_id))

  const openAdd = () => {
    setBusca('')
    setBuscaState('idle')
    setClienteEncontrado(null)
    setCandidatos([])
    setAddPapel('socio')
    setNovoNome('')
    setNovoTelefone('')
    setNovoEmail('')
    setAddOpen(true)
  }

  const executarBusca = () => {
    const termo = busca.trim()
    if (!termo) return

    const digits = termo.replace(/\D/g, '')
    const pfsList = todosClientes.filter((c) => c.tipo === 'fisica')

    // Busca por CPF se tiver 11+ dígitos
    if (digits.length >= 11) {
      const encontrado = pfsList.find((c) => c.cpf?.replace(/\D/g, '') === digits)
      if (encontrado) {
        setClienteEncontrado(encontrado)
        setCandidatos([])
        setBuscaState(vinculadosIds.has(encontrado.id) ? 'ja_vinculado' : 'encontrado')
      } else {
        setClienteEncontrado(null)
        setCandidatos([])
        setBuscaState('nao_encontrado')
      }
      return
    }

    // Busca por nome (mínimo 2 caracteres)
    if (termo.length < 2) {
      toast({ title: 'Digite ao menos 2 caracteres para buscar por nome', variant: 'destructive' })
      return
    }
    const termoLower = termo.toLowerCase()
    const resultados = pfsList.filter((c) =>
      c.razao_social.toLowerCase().includes(termoLower)
    )
    if (resultados.length === 0) {
      setClienteEncontrado(null)
      setCandidatos([])
      setBuscaState('nao_encontrado')
    } else if (resultados.length === 1) {
      setClienteEncontrado(resultados[0])
      setCandidatos([])
      setBuscaState(vinculadosIds.has(resultados[0].id) ? 'ja_vinculado' : 'encontrado')
    } else {
      setClienteEncontrado(null)
      setCandidatos(resultados)
      setBuscaState('multiplos')
    }
  }

  const selecionarCandidato = (c: Client) => {
    setClienteEncontrado(c)
    setCandidatos([])
    setBuscaState(vinculadosIds.has(c.id) ? 'ja_vinculado' : 'encontrado')
  }

  const handleVincularEncontrado = async () => {
    if (!clienteEncontrado) return
    try {
      await createVinculo.mutateAsync({
        id: uuidv4(),
        tenant_id: tenantId,
        client_pj_id: clientId,
        client_pf_id: clienteEncontrado.id,
        papel: addPapel,
        principal: pfsVinculados.length === 0,
      })
      toast({ title: `${clienteEncontrado.razao_social} vinculado` })
      setAddOpen(false)
    } catch {
      toast({ title: 'Erro ao vincular', variant: 'destructive' })
    }
  }

  const handleCadastrarEVincular = async () => {
    if (!novoNome.trim()) {
      toast({ title: 'Informe o nome', variant: 'destructive' })
      return
    }
    const digits = busca.replace(/\D/g, '')
    try {
      const pfId = uuidv4()
      await createClient.mutateAsync({
        client: {
          id: pfId,
          tenant_id: tenantId,
          tipo: 'fisica',
          razao_social: novoNome.trim(),
          cpf: digits || undefined,
          regime: 'Autônomo',
          status: 'ativo',
          telefone: novoTelefone.trim() || undefined,
          email: novoEmail.trim() || undefined,
        },
      })
      await createVinculo.mutateAsync({
        id: uuidv4(),
        tenant_id: tenantId,
        client_pj_id: clientId,
        client_pf_id: pfId,
        papel: addPapel,
        principal: pfsVinculados.length === 0,
      })
      toast({ title: `${novoNome.trim()} cadastrado e vinculado` })
      setAddOpen(false)
    } catch {
      toast({ title: 'Erro ao cadastrar', variant: 'destructive' })
    }
  }

  const openEdit = (v: PFComVinculo) => {
    setEditTarget(v)
    setEditPapel(v.papel)
    setEditPrincipal(v.principal)
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    try {
      await updateVinculo.mutateAsync({
        id: editTarget.id,
        data: { papel: editPapel, principal: editPrincipal },
      })
      toast({ title: 'Vínculo atualizado' })
      setEditTarget(null)
    } catch {
      toast({ title: 'Erro ao atualizar vínculo', variant: 'destructive' })
    }
  }

  const handleRemover = async (v: PFComVinculo) => {
    if (!confirm(`Remover vínculo de ${v.clientePF.razao_social}?`)) return
    try {
      await deleteVinculo.mutateAsync({ id: v.id, tenantId, pjId: clientId, pfId: v.client_pf_id })
      toast({ title: 'Vínculo removido' })
    } catch {
      toast({ title: 'Erro ao remover vínculo', variant: 'destructive' })
    }
  }

  const isSaving = createVinculo.isPending || createClient.isPending

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sócios / Adm. Cadastrados</CardTitle>
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pfsVinculados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum sócio / administrador cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {pfsVinculados.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
                  <span className="font-medium text-sm">{v.clientePF.razao_social}</span>
                  {v.clientePF.cpf && (
                    <span className="text-xs text-muted-foreground font-mono">{formatCPF(v.clientePF.cpf)}</span>
                  )}
                  <Badge variant="outline" className="text-xs">{PAPEL_LABELS[v.papel]}</Badge>
                  {v.principal && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                  <div className="ml-auto flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleRemover(v)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Adicionar Sócio */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Sócio / Administrador</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Busca por CPF ou Nome */}
            <div className="space-y-1">
              <Label>CPF ou Nome</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o CPF ou parte do nome..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setBuscaState('idle'); setCandidatos([]) }}
                  onKeyDown={(e) => e.key === 'Enter' && executarBusca()}
                  autoFocus
                />
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={executarBusca}>
                  <Search className="h-3.5 w-3.5 mr-1" /> Buscar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">CPF (11 dígitos) para busca exata, ou nome para busca parcial.</p>
            </div>

            {/* Resultado: múltiplos — lista para selecionar */}
            {buscaState === 'multiplos' && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{candidatos.length} resultado(s) — selecione um:</p>
                <div className="rounded-md border divide-y max-h-48 overflow-y-auto bg-popover text-popover-foreground">
                  {candidatos.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between gap-2 ${vinculadosIds.has(c.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !vinculadosIds.has(c.id) && selecionarCandidato(c)}
                      disabled={vinculadosIds.has(c.id)}
                    >
                      <span>
                        <span className="font-medium text-foreground">{c.razao_social}</span>
                        {c.cpf && <span className="text-xs text-muted-foreground ml-2 font-mono">{formatCPF(c.cpf)}</span>}
                      </span>
                      {vinculadosIds.has(c.id) && (
                        <Badge variant="secondary" className="text-xs shrink-0">já vinculado</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resultado: já vinculado */}
            {buscaState === 'ja_vinculado' && clienteEncontrado && (
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                <strong>{clienteEncontrado.razao_social}</strong> já está vinculado a esta empresa.
              </div>
            )}

            {/* Resultado: encontrado */}
            {buscaState === 'encontrado' && clienteEncontrado && (
              <>
                <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40 px-3 py-2 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-sm font-medium text-foreground">{clienteEncontrado.razao_social}</span>
                  </div>
                  {clienteEncontrado.cpf && (
                    <p className="text-xs text-muted-foreground pl-6">
                      CPF: {formatCPF(clienteEncontrado.cpf)}
                    </p>
                  )}
                  {clienteEncontrado.email && (
                    <p className="text-xs text-muted-foreground pl-6">{clienteEncontrado.email}</p>
                  )}
                  {clienteEncontrado.telefone && (
                    <p className="text-xs text-muted-foreground pl-6">{clienteEncontrado.telefone}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Papel nesta empresa</Label>
                  <Select value={addPapel} onValueChange={(v) => setAddPapel(v as PapelPessoa)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAPEL_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Resultado: não encontrado — cadastro preliminar */}
            {buscaState === 'nao_encontrado' && (
              <>
                <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 px-3 py-2 flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <UserPlus className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>CPF não encontrado. Preencha os dados para cadastro preliminar.</span>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Nome completo *</Label>
                    <Input
                      autoFocus
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Telefone</Label>
                      <Input
                        placeholder="(44) 99999-0000"
                        value={novoTelefone}
                        onChange={(e) => setNovoTelefone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Papel nesta empresa</Label>
                    <Select value={addPapel} onValueChange={(v) => setAddPapel(v as PapelPessoa)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAPEL_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            {buscaState === 'encontrado' && (
              <Button onClick={handleVincularEncontrado} disabled={isSaving}>
                Vincular
              </Button>
            )}
            {buscaState === 'nao_encontrado' && (
              <Button onClick={handleCadastrarEVincular} disabled={!novoNome.trim() || isSaving}>
                Cadastrar e vincular
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Vínculo */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Vínculo</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-3 py-1">
              <p className="text-sm font-medium">{editTarget.clientePF.razao_social}</p>
              <div className="space-y-1">
                <Label>Papel</Label>
                <Select value={editPapel} onValueChange={(v) => setEditPapel(v as PapelPessoa)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAPEL_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-vinculo-principal"
                  checked={editPrincipal}
                  onChange={(e) => setEditPrincipal(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="edit-vinculo-principal" className="cursor-pointer font-normal">Principal</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateVinculo.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
