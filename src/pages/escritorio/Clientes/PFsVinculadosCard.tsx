import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { PapelPessoa } from '@/domain/types'
import {
  usePFsDeEmpresa,
  useCreateClientVinculo,
  useUpdateClientVinculo,
  useDeleteClientVinculo,
  type PFComVinculo,
} from '@/data/hooks/useClientVinculos'
import { useClients } from '@/data/hooks/useClients'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAPEL_LABELS: Record<PapelPessoa, string> = {
  socio: 'Sócio',
  administrador: 'Administrador',
  procurador: 'Procurador',
  contato_financeiro: 'Contato Financeiro',
  contato_principal: 'Contato Principal',
}

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

  const [addOpen, setAddOpen] = useState(false)
  const [addPfId, setAddPfId] = useState('')
  const [addPapel, setAddPapel] = useState<PapelPessoa>('socio')

  const [editTarget, setEditTarget] = useState<PFComVinculo | null>(null)
  const [editPapel, setEditPapel] = useState<PapelPessoa>('socio')
  const [editPrincipal, setEditPrincipal] = useState(false)

  const vinculadosIds = new Set(pfsVinculados.map((v) => v.client_pf_id))
  const pfsDisponiveis = todosClientes.filter(
    (c) => c.tipo === 'fisica' && !vinculadosIds.has(c.id)
  )

  const openAdd = () => {
    setAddPfId('')
    setAddPapel('socio')
    setAddOpen(true)
  }

  const handleAdd = async () => {
    if (!addPfId) return
    try {
      await createVinculo.mutateAsync({
        id: uuidv4(),
        tenant_id: tenantId,
        client_pj_id: clientId,
        client_pf_id: addPfId,
        papel: addPapel,
        principal: pfsVinculados.length === 0,
      })
      toast({ title: 'PF vinculado' })
      setAddOpen(false)
    } catch {
      toast({ title: 'Erro ao vincular PF', variant: 'destructive' })
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
      await deleteVinculo.mutateAsync({
        id: v.id,
        tenantId,
        pjId: clientId,
        pfId: v.client_pf_id,
      })
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
            <CardTitle className="text-base">Sócios / Adm. Cadastrados</CardTitle>
            <Button variant="outline" size="sm" onClick={openAdd} disabled={pfsDisponiveis.length === 0}>
              <Plus className="h-3 w-3 mr-1" /> Vincular PF
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
                  <Badge variant="outline" className="text-xs">{PAPEL_LABELS[v.papel]}</Badge>
                  {v.principal && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                  <div className="ml-auto flex gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      title="Editar" onClick={() => openEdit(v)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Remover" onClick={() => handleRemover(v)}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Vincular PF</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Pessoa Física</Label>
              <Select value={addPfId} onValueChange={setAddPfId}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente PF..." /></SelectTrigger>
                <SelectContent>
                  {pfsDisponiveis.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.razao_social}{c.cpf ? ` — ${c.cpf}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Papel</Label>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!addPfId || createVinculo.isPending}>
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Vínculo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
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
              <Label htmlFor="edit-vinculo-principal" className="cursor-pointer font-normal">
                Principal
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateVinculo.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
