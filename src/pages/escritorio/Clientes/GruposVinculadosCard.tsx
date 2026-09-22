import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Trash2 } from 'lucide-react'
import type { TipoGrupo } from '@/domain/types'
import {
  useEmpresaGrupos,
  useGrupos,
  useCreateGrupoEmpresa,
  useDeleteGrupoEmpresa,
} from '@/data/hooks/useGrupos'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const TIPO_LABELS: Record<TipoGrupo, string> = {
  grupo_economico: 'Grupo Econômico',
  carteira: 'Carteira',
  segmento: 'Segmento',
  tag: 'Tag',
}

interface Props {
  tenantId: string
  clientId: string
}

export function GruposVinculadosCard({ tenantId, clientId }: Props) {
  const { toast } = useToast()
  const { data: empresaGrupos = [] } = useEmpresaGrupos(tenantId, clientId)
  const { data: todosGrupos = [] } = useGrupos(tenantId)

  const createGrupoEmpresa = useCreateGrupoEmpresa()
  const deleteGrupoEmpresa = useDeleteGrupoEmpresa()

  const [addOpen, setAddOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const vinculadosIds = new Set(empresaGrupos.map((eg) => eg.grupo_id))
  const gruposDisponiveis = todosGrupos.filter((g) => !vinculadosIds.has(g.id))

  const openAdd = () => {
    setSelectedIds(new Set())
    setAddOpen(true)
  }

  const toggleGrupo = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAdd = async () => {
    if (selectedIds.size === 0) return
    try {
      await Promise.all(
        Array.from(selectedIds).map((grupoId) =>
          createGrupoEmpresa.mutateAsync({
            id: uuidv4(),
            tenant_id: tenantId,
            grupo_id: grupoId,
            empresa_id: clientId,
          })
        )
      )
      toast({ title: selectedIds.size === 1 ? 'Grupo vinculado' : `${selectedIds.size} grupos vinculados` })
      setAddOpen(false)
    } catch {
      toast({ title: 'Erro ao vincular grupos', variant: 'destructive' })
    }
  }

  const handleRemover = async (vinculoId: string, grupoId: string) => {
    if (!confirm('Remover este grupo da empresa?')) return
    try {
      await deleteGrupoEmpresa.mutateAsync({
        id: vinculoId,
        tenantId,
        grupoId,
        empresaId: clientId,
      })
      toast({ title: 'Grupo removido' })
    } catch {
      toast({ title: 'Erro ao remover grupo', variant: 'destructive' })
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Grupos</CardTitle>
            <Button variant="outline" size="sm" onClick={openAdd} disabled={gruposDisponiveis.length === 0}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {empresaGrupos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta empresa não pertence a nenhum grupo.</p>
          ) : (
            <div className="space-y-2">
              {empresaGrupos.map((eg) => {
                const grupo = todosGrupos.find((g) => g.id === eg.grupo_id)
                return (
                  <div key={eg.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: grupo?.cor ?? '#6b7280' }}
                    />
                    <span className="font-medium text-sm">{grupo?.nome ?? eg.grupo_id}</span>
                    {grupo && (
                      <Badge variant="outline" className="text-xs">
                        {TIPO_LABELS[grupo.tipo]}
                      </Badge>
                    )}
                    <div className="ml-auto">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemover(eg.id, eg.grupo_id)}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar a Grupos</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto py-1">
            {gruposDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum grupo disponível.</p>
            ) : (
              gruposDisponiveis.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(g.id)}
                    onChange={() => toggleGrupo(g.id)}
                    className="h-4 w-4"
                  />
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: g.cor ?? '#6b7280' }}
                  />
                  <span className="text-sm font-medium flex-1">{g.nome}</span>
                  <Badge variant="outline" className="text-xs">{TIPO_LABELS[g.tipo]}</Badge>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAdd}
              disabled={selectedIds.size === 0 || createGrupoEmpresa.isPending}
            >
              Adicionar selecionados ({selectedIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
