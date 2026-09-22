import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import type { TipoGrupo } from '@/domain/types'
import {
  useGrupo,
  useGrupoEmpresas,
  useUpdateGrupo,
  useCreateGrupoEmpresa,
  useDeleteGrupoEmpresa,
} from '@/data/hooks/useGrupos'
import { useClients } from '@/data/hooks/useClients'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCNPJ, formatCPF } from '@/lib/utils'

const TIPO_LABELS: Record<TipoGrupo, string> = {
  grupo_economico: 'Grupo Econômico',
  carteira: 'Carteira',
  segmento: 'Segmento',
  tag: 'Tag',
}

const COR_PALETTE = [
  '#6b7280', '#3b82f6', '#22c55e', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

export default function GrupoFicha() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()

  const { data: grupo, isLoading } = useGrupo(id ?? '')
  const { data: vinculos = [] } = useGrupoEmpresas(tenantId, id ?? '')
  const { data: clientes = [] } = useClients(tenantId)

  const updateGrupo = useUpdateGrupo()
  const createGrupoEmpresa = useCreateGrupoEmpresa()
  const deleteGrupoEmpresa = useDeleteGrupoEmpresa()

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ nome: '', tipo: 'carteira' as TipoGrupo, cor: '#3b82f6', observacao: '' })

  const [addOpen, setAddOpen] = useState(false)
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())

  const openEdit = () => {
    if (!grupo) return
    setEditForm({
      nome: grupo.nome,
      tipo: grupo.tipo,
      cor: grupo.cor ?? '#3b82f6',
      observacao: grupo.observacao ?? '',
    })
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!grupo || !editForm.nome.trim()) return
    try {
      await updateGrupo.mutateAsync({
        id: grupo.id,
        data: {
          nome: editForm.nome.trim(),
          tipo: editForm.tipo,
          cor: editForm.cor,
          observacao: editForm.observacao.trim() || undefined,
        },
      })
      toast({ title: 'Grupo atualizado' })
      setEditOpen(false)
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const vinculadosIds = new Set(vinculos.map((v) => v.empresa_id))
  const clientesDisponiveis = clientes.filter((c) => !vinculadosIds.has(c.id))

  const openAdd = () => {
    setSelectedClientIds(new Set())
    setAddOpen(true)
  }

  const toggleCliente = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddEmpresa = async () => {
    if (selectedClientIds.size === 0 || !grupo) return
    try {
      await Promise.all(
        Array.from(selectedClientIds).map((clienteId) =>
          createGrupoEmpresa.mutateAsync({
            id: uuidv4(),
            tenant_id: tenantId,
            grupo_id: grupo.id,
            empresa_id: clienteId,
          })
        )
      )
      toast({ title: selectedClientIds.size === 1 ? 'Empresa adicionada ao grupo' : `${selectedClientIds.size} empresas adicionadas` })
      setAddOpen(false)
    } catch {
      toast({ title: 'Erro ao adicionar empresas', variant: 'destructive' })
    }
  }

  const handleRemover = async (vinculoId: string, empresaId: string) => {
    if (!confirm('Remover esta empresa do grupo?')) return
    try {
      await deleteGrupoEmpresa.mutateAsync({
        id: vinculoId,
        tenantId,
        grupoId: id ?? '',
        empresaId,
      })
      toast({ title: 'Empresa removida do grupo' })
    } catch {
      toast({ title: 'Erro ao remover empresa', variant: 'destructive' })
    }
  }

  if (isLoading) return <PageLoader />
  if (!grupo) return (
    <div className="p-6">
      <p className="text-muted-foreground">Grupo não encontrado.</p>
      <Button variant="link" onClick={() => navigate('/escritorio/grupos')}>Voltar</Button>
    </div>
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/escritorio/grupos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{grupo.nome}</h1>
      </div>

      {/* Card informações do grupo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Informações</CardTitle>
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-3 w-3 mr-1" /> Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: grupo.cor ?? '#6b7280' }}
            />
            <span className="text-sm font-medium">{grupo.nome}</span>
            <Badge variant="outline" className="text-xs">{TIPO_LABELS[grupo.tipo]}</Badge>
          </div>
          {grupo.observacao && (
            <p className="text-sm text-muted-foreground">{grupo.observacao}</p>
          )}
        </CardContent>
      </Card>

      {/* Card empresas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Empresas neste Grupo</CardTitle>
            <Button variant="outline" size="sm" onClick={openAdd} disabled={clientesDisponiveis.length === 0}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar Empresa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {vinculos.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Nenhuma empresa neste grupo.</p>
          ) : (
            <div className="divide-y">
              {vinculos.map((v) => {
                const cliente = clientes.find((c) => c.id === v.empresa_id)
                return (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                    {cliente ? (
                      <Link
                        to={`/escritorio/clientes/${v.empresa_id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {cliente.razao_social}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">{v.empresa_id}</span>
                    )}
                    {cliente && (
                      <span className="text-xs text-muted-foreground">{cliente.cnpj}</span>
                    )}
                    <div className="ml-auto">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemover(v.id, v.empresa_id)}
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

      {/* Dialog editar grupo */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                autoFocus
                value={editForm.nome}
                onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={editForm.tipo}
                onValueChange={(v) => setEditForm((f) => ({ ...f, tipo: v as TipoGrupo }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {COR_PALETTE.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    className="h-7 w-7 rounded border-2 transition-all"
                    style={{
                      backgroundColor: cor,
                      borderColor: editForm.cor === cor ? '#1e293b' : 'transparent',
                      outline: editForm.cor === cor ? '2px solid #1e293b' : 'none',
                      outlineOffset: '1px',
                    }}
                    onClick={() => setEditForm((f) => ({ ...f, cor }))}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Input
                value={editForm.observacao}
                onChange={(e) => setEditForm((f) => ({ ...f, observacao: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.nome.trim() || updateGrupo.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog adicionar empresa */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Empresas</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto py-1">
            {clientesDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente disponível.</p>
            ) : (
              clientesDisponiveis.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={selectedClientIds.has(c.id)}
                    onChange={() => toggleCliente(c.id)}
                    className="h-4 w-4"
                  />
                  <Badge variant="outline" className="text-xs shrink-0">
                    {c.tipo === 'fisica' ? 'PF' : 'PJ'}
                  </Badge>
                  <span className="text-sm font-medium flex-1">{c.razao_social}</span>
                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    {c.tipo === 'fisica'
                      ? (c.cpf ? formatCPF(c.cpf) : '')
                      : (c.cnpj ? formatCNPJ(c.cnpj) : '')}
                  </span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAddEmpresa}
              disabled={selectedClientIds.size === 0 || createGrupoEmpresa.isPending}
            >
              Adicionar selecionados ({selectedClientIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
