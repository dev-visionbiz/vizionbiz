import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { PapelPessoa, TipoPessoa } from '@/domain/types'
import {
  useClientContatos, usePessoas,
  useCreatePessoa, useCreateEmpresaPessoa,
  useUpdatePessoa, useUpdateEmpresaPessoa, useDeleteEmpresaPessoa,
  type ContatoComPessoa,
} from '@/data/hooks/usePessoas'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const PAPEL_LABELS: Record<PapelPessoa, string> = {
  socio: 'Sócio',
  administrador: 'Administrador',
  procurador: 'Procurador',
  contato_financeiro: 'Contato Financeiro',
  contato_principal: 'Contato Principal',
}

const NOVA_FORM_DEFAULT = {
  nome: '', cpf: '', cnpj: '', email: '', telefone: '',
  papel: 'contato_principal' as PapelPessoa,
  tipo: 'fisica' as TipoPessoa,
}

interface Props {
  tenantId: string
  clientId: string
}

export function PessoasVinculadasCard({ tenantId, clientId }: Props) {
  const { toast } = useToast()
  const { data: contatos = [] } = useClientContatos(tenantId, clientId)
  const { data: todasPessoas = [] } = usePessoas(tenantId)

  const createPessoa = useCreatePessoa()
  const createEmpresaPessoa = useCreateEmpresaPessoa()
  const updatePessoa = useUpdatePessoa()
  const updateEmpresaPessoa = useUpdateEmpresaPessoa()
  const deleteEmpresaPessoa = useDeleteEmpresaPessoa()

  // --- Vincular dialog ---
  const [vincularOpen, setVincularOpen] = useState(false)
  const [novaForm, setNovaForm] = useState(NOVA_FORM_DEFAULT)
  const [existenteId, setExistenteId] = useState('')
  const [existentePapel, setExistentePapel] = useState<PapelPessoa>('contato_principal')

  // --- Editar dialog ---
  const [editTarget, setEditTarget] = useState<ContatoComPessoa | null>(null)
  const [editForm, setEditForm] = useState({ nome: '', cpf: '', email: '', telefone: '' })
  const [editPapel, setEditPapel] = useState<PapelPessoa>('contato_principal')
  const [editPrincipal, setEditPrincipal] = useState(false)

  const linkedIds = new Set(contatos.map((c) => c.pessoa_id))
  const pessoasDisponiveis = todasPessoas.filter((p) => !linkedIds.has(p.id))

  const openVincular = () => {
    setNovaForm(NOVA_FORM_DEFAULT)
    setExistenteId('')
    setExistentePapel('contato_principal')
    setVincularOpen(true)
  }

  const handleVincularNova = async () => {
    if (!novaForm.nome.trim()) return
    try {
      const pessoaId = uuidv4()
      await createPessoa.mutateAsync({
        id: pessoaId, tenant_id: tenantId,
        tipo: novaForm.tipo,
        nome: novaForm.nome.trim(),
        cpf: novaForm.tipo === 'fisica' ? (novaForm.cpf.trim() || undefined) : undefined,
        cnpj: novaForm.tipo === 'juridica' ? (novaForm.cnpj.trim() || undefined) : undefined,
        email: novaForm.email.trim() || undefined,
        telefone: novaForm.telefone.trim() || undefined,
      })
      await createEmpresaPessoa.mutateAsync({
        id: uuidv4(), tenant_id: tenantId,
        empresa_id: clientId, pessoa_id: pessoaId,
        papel: novaForm.papel, principal: contatos.length === 0,
      })
      toast({ title: 'Pessoa criada e vinculada' })
      setVincularOpen(false)
    } catch {
      toast({ title: 'Erro ao vincular pessoa', variant: 'destructive' })
    }
  }

  const handleVincularExistente = async () => {
    if (!existenteId) return
    try {
      await createEmpresaPessoa.mutateAsync({
        id: uuidv4(), tenant_id: tenantId,
        empresa_id: clientId, pessoa_id: existenteId,
        papel: existentePapel, principal: false,
      })
      toast({ title: 'Pessoa vinculada' })
      setVincularOpen(false)
    } catch {
      toast({ title: 'Erro ao vincular pessoa', variant: 'destructive' })
    }
  }

  const openEdit = (c: ContatoComPessoa) => {
    setEditTarget(c)
    setEditForm({
      nome: c.pessoa.nome,
      cpf: c.pessoa.cpf ?? '',
      email: c.pessoa.email ?? '',
      telefone: c.pessoa.telefone ?? '',
    })
    setEditPapel(c.papel)
    setEditPrincipal(c.principal)
  }

  const handleSaveEdit = async () => {
    if (!editTarget || !editForm.nome.trim()) return
    try {
      await updatePessoa.mutateAsync({
        id: editTarget.pessoa_id,
        data: {
          nome: editForm.nome.trim(),
          cpf: editForm.cpf.trim() || undefined,
          email: editForm.email.trim() || undefined,
          telefone: editForm.telefone.trim() || undefined,
        },
      })
      await updateEmpresaPessoa.mutateAsync({
        id: editTarget.id,
        data: { papel: editPapel, principal: editPrincipal },
      })
      toast({ title: 'Dados atualizados' })
      setEditTarget(null)
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleRemover = async (c: ContatoComPessoa) => {
    if (!confirm(`Remover vínculo de ${c.pessoa.nome} com esta empresa?`)) return
    try {
      await deleteEmpresaPessoa.mutateAsync({ id: c.id, tenantId, empresaId: clientId })
      toast({ title: 'Vínculo removido' })
    } catch {
      toast({ title: 'Erro ao remover vínculo', variant: 'destructive' })
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Pessoas Vinculadas</CardTitle>
            <Button variant="outline" size="sm" onClick={openVincular}>
              <Plus className="h-3 w-3 mr-1" /> Vincular
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contatos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pessoa vinculada.</p>
          ) : (
            <div className="space-y-2">
              {contatos.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
                  <span className="font-medium text-sm">{c.pessoa.nome}</span>
                  <Badge variant="outline" className="text-xs">{PAPEL_LABELS[c.papel]}</Badge>
                  {c.principal && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                  {c.pessoa.email && (
                    <span className="text-xs text-muted-foreground">{c.pessoa.email}</span>
                  )}
                  {c.pessoa.telefone && (
                    <span className="text-xs text-muted-foreground">{c.pessoa.telefone}</span>
                  )}
                  <div className="ml-auto flex gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      title="Editar" onClick={() => openEdit(c)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Remover vínculo" onClick={() => handleRemover(c)}
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

      {/* Dialog: Vincular Pessoa */}
      <Dialog open={vincularOpen} onOpenChange={setVincularOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Pessoa</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="nova">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="nova" className="flex-1">Nova pessoa</TabsTrigger>
              <TabsTrigger value="existente" className="flex-1" disabled={pessoasDisponiveis.length === 0}>
                Pessoa existente{pessoasDisponiveis.length > 0 ? ` (${pessoasDisponiveis.length})` : ''}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nova" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Tipo</Label>
                  <Select
                    value={novaForm.tipo}
                    onValueChange={(v) => setNovaForm((f) => ({ ...f, tipo: v as TipoPessoa }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisica">Pessoa Física</SelectItem>
                      <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Nome *</Label>
                  <Input
                    autoFocus
                    value={novaForm.nome}
                    onChange={(e) => setNovaForm((f) => ({ ...f, nome: e.target.value }))}
                  />
                </div>
                {novaForm.tipo === 'fisica' ? (
                  <div className="space-y-1">
                    <Label>CPF</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={novaForm.cpf}
                      onChange={(e) => setNovaForm((f) => ({ ...f, cpf: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>CNPJ</Label>
                    <Input
                      placeholder="00.000.000/0001-00"
                      value={novaForm.cnpj}
                      onChange={(e) => setNovaForm((f) => ({ ...f, cnpj: e.target.value }))}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(11) 99999-0000"
                    value={novaForm.telefone}
                    onChange={(e) => setNovaForm((f) => ({ ...f, telefone: e.target.value }))}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={novaForm.email}
                    onChange={(e) => setNovaForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Papel</Label>
                  <Select
                    value={novaForm.papel}
                    onValueChange={(v) => setNovaForm((f) => ({ ...f, papel: v as PapelPessoa }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAPEL_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVincularOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleVincularNova}
                  disabled={!novaForm.nome.trim() || createPessoa.isPending}
                >
                  Criar e vincular
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="existente" className="space-y-3">
              <div className="space-y-1">
                <Label>Pessoa</Label>
                <Select value={existenteId} onValueChange={setExistenteId}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma pessoa..." /></SelectTrigger>
                  <SelectContent>
                    {pessoasDisponiveis.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}{p.cpf ? ` — ${p.cpf}` : ''}
                        {p.email ? ` (${p.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Papel nesta empresa</Label>
                <Select value={existentePapel} onValueChange={(v) => setExistentePapel(v as PapelPessoa)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAPEL_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVincularOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleVincularExistente}
                  disabled={!existenteId || createEmpresaPessoa.isPending}
                >
                  Vincular
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Pessoa + Vínculo */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Pessoa</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="col-span-2 space-y-1">
              <Label>Nome *</Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input
                value={editForm.cpf}
                onChange={(e) => setEditForm((f) => ({ ...f, cpf: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input
                value={editForm.telefone}
                onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Papel nesta empresa</Label>
              <Select value={editPapel} onValueChange={(v) => setEditPapel(v as PapelPessoa)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAPEL_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-principal"
                checked={editPrincipal}
                onChange={(e) => setEditPrincipal(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-principal" className="cursor-pointer font-normal">
                Contato principal desta empresa
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editForm.nome.trim() || updatePessoa.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
