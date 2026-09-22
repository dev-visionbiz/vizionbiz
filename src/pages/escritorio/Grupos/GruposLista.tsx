import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import type { TipoGrupo } from '@/domain/types'
import {
  useGrupos,
  useAllGrupoEmpresas,
  useCreateGrupo,
  useUpdateGrupo,
  useDeleteGrupo,
} from '@/data/hooks/useGrupos'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

const EMPTY_FORM = {
  nome: '',
  tipo: 'carteira' as TipoGrupo,
  cor: '#3b82f6',
  observacao: '',
}

export default function GruposLista() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: grupos = [] } = useGrupos(tenantId)
  const { data: allVinculos = [] } = useAllGrupoEmpresas(tenantId)

  const createGrupo = useCreateGrupo()
  const updateGrupo = useUpdateGrupo()
  const deleteGrupo = useDeleteGrupo()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const empresaCount = (grupoId: string) =>
    allVinculos.filter((v) => v.grupo_id === grupoId).length

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (id: string) => {
    const g = grupos.find((x) => x.id === id)
    if (!g) return
    setEditId(id)
    setForm({
      nome: g.nome,
      tipo: g.tipo,
      cor: g.cor ?? '#3b82f6',
      observacao: g.observacao ?? '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.nome.trim()) return
    try {
      const data = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        cor: form.cor,
        observacao: form.observacao.trim() || undefined,
      }
      if (editId) {
        await updateGrupo.mutateAsync({ id: editId, data })
        toast({ title: 'Grupo atualizado' })
      } else {
        await createGrupo.mutateAsync({ id: uuidv4(), tenant_id: tenantId, ...data })
        toast({ title: 'Grupo criado' })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteGrupo.mutateAsync({ id: deleteTarget, tenantId })
      toast({ title: 'Grupo excluído' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const isPending = createGrupo.isPending || updateGrupo.isPending

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Grupos</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo Grupo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{grupos.length} grupo(s)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Nenhum grupo cadastrado.</p>
          ) : (
            <div className="divide-y">
              {grupos.map((g) => {
                const count = empresaCount(g.id)
                return (
                  <div key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: g.cor ?? '#6b7280' }}
                    />
                    <span className="font-medium text-sm">{g.nome}</span>
                    <Badge variant="outline" className="text-xs">
                      {TIPO_LABELS[g.tipo]}
                    </Badge>
                    <Badge variant={count > 0 ? 'secondary' : 'outline'} className="text-xs">
                      {count} empresa(s)
                    </Badge>
                    <div className="ml-auto flex gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        title="Ver detalhe"
                        onClick={() => navigate(`/escritorio/grupos/${g.id}`)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g.id)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(g.id)}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                autoFocus
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as TipoGrupo }))}
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
                      borderColor: form.cor === cor ? '#1e293b' : 'transparent',
                      outline: form.cor === cor ? '2px solid #1e293b' : 'none',
                      outlineOffset: '1px',
                    }}
                    onClick={() => setForm((f) => ({ ...f, cor }))}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Input
                value={form.observacao}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome.trim() || isPending}>
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
            Deseja realmente excluir este grupo? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteGrupo.isPending}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
