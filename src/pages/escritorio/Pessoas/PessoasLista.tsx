import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import type { TipoPessoa } from '@/domain/types'
import {
  usePessoas,
  useAllEmpresaPessoas,
  useCreatePessoa,
  useUpdatePessoa,
  useDeletePessoa,
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

const EMPTY_PF = {
  nome: '', cpf: '', rg: '', data_nascimento: '', email: '', telefone: '',
}
const EMPTY_PJ = {
  nome: '', fantasia: '', cnpj: '', email: '', telefone: '',
}

export default function PessoasLista() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()

  const { data: pessoas = [] } = usePessoas(tenantId)
  const { data: allVinculos = [] } = useAllEmpresaPessoas(tenantId)

  const createPessoa = useCreatePessoa()
  const updatePessoa = useUpdatePessoa()
  const deletePessoa = useDeletePessoa()

  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoPessoa>('todos')

  // Dialog criar/editar
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formTab, setFormTab] = useState<TipoPessoa>('fisica')
  const [pfForm, setPfForm] = useState(EMPTY_PF)
  const [pjForm, setPjForm] = useState(EMPTY_PJ)

  // Dialog confirmar exclusão
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const vinculoCount = (pessoaId: string) =>
    allVinculos.filter((v) => v.pessoa_id === pessoaId).length

  const filtradas = pessoas.filter((p) => {
    if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false
    const q = search.toLowerCase()
    if (!q) return true
    return (
      p.nome.toLowerCase().includes(q) ||
      (p.cpf ?? '').toLowerCase().includes(q) ||
      (p.cnpj ?? '').toLowerCase().includes(q)
    )
  })

  const openCreate = () => {
    setEditId(null)
    setFormTab('fisica')
    setPfForm(EMPTY_PF)
    setPjForm(EMPTY_PJ)
    setDialogOpen(true)
  }

  const openEdit = (id: string) => {
    const p = pessoas.find((x) => x.id === id)
    if (!p) return
    setEditId(id)
    setFormTab(p.tipo)
    if (p.tipo === 'fisica') {
      setPfForm({
        nome: p.nome,
        cpf: p.cpf ?? '',
        rg: p.rg ?? '',
        data_nascimento: p.data_nascimento ?? '',
        email: p.email ?? '',
        telefone: p.telefone ?? '',
      })
    } else {
      setPjForm({
        nome: p.nome,
        fantasia: p.fantasia ?? '',
        cnpj: p.cnpj ?? '',
        email: p.email ?? '',
        telefone: p.telefone ?? '',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (formTab === 'fisica') {
        if (!pfForm.nome.trim()) return
        const data = {
          tipo: 'fisica' as const,
          nome: pfForm.nome.trim(),
          cpf: pfForm.cpf.trim() || undefined,
          rg: pfForm.rg.trim() || undefined,
          data_nascimento: pfForm.data_nascimento.trim() || undefined,
          email: pfForm.email.trim() || undefined,
          telefone: pfForm.telefone.trim() || undefined,
        }
        if (editId) {
          await updatePessoa.mutateAsync({ id: editId, data })
          toast({ title: 'Pessoa atualizada' })
        } else {
          await createPessoa.mutateAsync({ id: uuidv4(), tenant_id: tenantId, ...data })
          toast({ title: 'Pessoa criada' })
        }
      } else {
        if (!pjForm.nome.trim()) return
        const data = {
          tipo: 'juridica' as const,
          nome: pjForm.nome.trim(),
          fantasia: pjForm.fantasia.trim() || undefined,
          cnpj: pjForm.cnpj.trim() || undefined,
          email: pjForm.email.trim() || undefined,
          telefone: pjForm.telefone.trim() || undefined,
        }
        if (editId) {
          await updatePessoa.mutateAsync({ id: editId, data })
          toast({ title: 'Pessoa atualizada' })
        } else {
          await createPessoa.mutateAsync({ id: uuidv4(), tenant_id: tenantId, ...data })
          toast({ title: 'Pessoa criada' })
        }
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    const count = vinculoCount(id)
    if (count > 0) {
      toast({
        title: 'Não é possível excluir',
        description: `Esta pessoa possui ${count} vínculo(s) com empresas.`,
        variant: 'destructive',
      })
      return
    }
    setDeleteTarget(id)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePessoa.mutateAsync({ id: deleteTarget, tenantId })
      toast({ title: 'Pessoa excluída' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const isPending = createPessoa.isPending || updatePessoa.isPending
  const currentFormName = formTab === 'fisica' ? pfForm.nome : pjForm.nome

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pessoas</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova Pessoa
        </Button>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Buscar por nome, CPF ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as 'todos' | TipoPessoa)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="fisica">Pessoa Física</SelectItem>
            <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{filtradas.length} pessoa(s)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Nenhuma pessoa encontrada.</p>
          ) : (
            <div className="divide-y">
              {filtradas.map((p) => {
                const count = vinculoCount(p.id)
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Badge
                      variant="outline"
                      className={p.tipo === 'fisica' ? 'text-blue-700 border-blue-300 bg-blue-50' : 'text-purple-700 border-purple-300 bg-purple-50'}
                    >
                      {p.tipo === 'fisica' ? 'PF' : 'PJ'}
                    </Badge>
                    <span className="font-medium text-sm">{p.nome}</span>
                    {p.tipo === 'fisica' && p.cpf && (
                      <span className="text-xs text-muted-foreground">{p.cpf}</span>
                    )}
                    {p.tipo === 'juridica' && p.cnpj && (
                      <span className="text-xs text-muted-foreground">{p.cnpj}</span>
                    )}
                    {p.email && (
                      <span className="text-xs text-muted-foreground">{p.email}</span>
                    )}
                    <Badge variant={count > 0 ? 'secondary' : 'outline'} className="text-xs">
                      {count} empresa(s)
                    </Badge>
                    <div className="ml-auto flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p.id)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Pessoa' : 'Nova Pessoa'}</DialogTitle>
          </DialogHeader>
          <Tabs value={formTab} onValueChange={(v) => setFormTab(v as TipoPessoa)}>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="fisica" className="flex-1" disabled={!!editId}>Pessoa Física</TabsTrigger>
              <TabsTrigger value="juridica" className="flex-1" disabled={!!editId}>Pessoa Jurídica</TabsTrigger>
            </TabsList>

            <TabsContent value="fisica" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Nome *</Label>
                  <Input
                    autoFocus
                    value={pfForm.nome}
                    onChange={(e) => setPfForm((f) => ({ ...f, nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CPF</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={pfForm.cpf}
                    onChange={(e) => setPfForm((f) => ({ ...f, cpf: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>RG</Label>
                  <Input
                    value={pfForm.rg}
                    onChange={(e) => setPfForm((f) => ({ ...f, rg: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={pfForm.data_nascimento}
                    onChange={(e) => setPfForm((f) => ({ ...f, data_nascimento: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(11) 99999-0000"
                    value={pfForm.telefone}
                    onChange={(e) => setPfForm((f) => ({ ...f, telefone: e.target.value }))}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={pfForm.email}
                    onChange={(e) => setPfForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="juridica" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Razão Social *</Label>
                  <Input
                    autoFocus
                    value={pjForm.nome}
                    onChange={(e) => setPjForm((f) => ({ ...f, nome: e.target.value }))}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Nome Fantasia</Label>
                  <Input
                    value={pjForm.fantasia}
                    onChange={(e) => setPjForm((f) => ({ ...f, fantasia: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CNPJ</Label>
                  <Input
                    placeholder="00.000.000/0001-00"
                    value={pjForm.cnpj}
                    onChange={(e) => setPjForm((f) => ({ ...f, cnpj: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(11) 99999-0000"
                    value={pjForm.telefone}
                    onChange={(e) => setPjForm((f) => ({ ...f, telefone: e.target.value }))}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={pjForm.email}
                    onChange={(e) => setPjForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!currentFormName.trim() || isPending}
            >
              {editId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deseja realmente excluir esta pessoa? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletePessoa.isPending}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
