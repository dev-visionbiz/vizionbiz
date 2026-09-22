import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { usePlanos, useCreatePlano, useUpdatePlano, useDeletePlano } from '@/data/hooks/usePlanos'
import { useServicos } from '@/data/hooks/useServicos'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import { Switch } from '@/components/ui/switch'
import { Pencil, Trash2, Plus, Package, X } from 'lucide-react'
import type { Plano, PlanoItem } from '@/domain/types'
import { formatCurrency } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

type ItemLocal = PlanoItem & { _key: string }

const emptyForm = { nome: '', descricao: '', ativo: true }

export default function Planos() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: planos, isLoading } = usePlanos(tenantId)
  const { data: servicos } = useServicos(tenantId)
  const createPlano = useCreatePlano()
  const updatePlano = useUpdatePlano()
  const deletePlano = useDeletePlano()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Plano | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [itens, setItens] = useState<ItemLocal[]>([])
  const [addServiceId, setAddServiceId] = useState('')

  const servicoNome = (id: string) => servicos?.find((s) => s.id === id)?.nome ?? id
  const servicoValor = (id: string) => servicos?.find((s) => s.id === id)?.valor_padrao ?? 0

  const calcTotal = (items: ItemLocal[]) =>
    items.reduce((s, i) => s + servicoValor(i.servico_id) * i.quantidade, 0)

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setItens([])
    setAddServiceId('')
    setDialogOpen(true)
  }

  const openEdit = (p: Plano) => {
    setEditTarget(p)
    setForm({ nome: p.nome, descricao: p.descricao ?? '', ativo: p.ativo })
    setItens(p.itens.map((i) => ({ ...i, _key: uuidv4() })))
    setAddServiceId('')
    setDialogOpen(true)
  }

  const addItem = () => {
    if (!addServiceId) return
    if (itens.some((i) => i.servico_id === addServiceId)) {
      toast({ title: 'Serviço já adicionado', variant: 'destructive' })
      return
    }
    setItens((prev) => [...prev, { servico_id: addServiceId, quantidade: 1, _key: uuidv4() }])
    setAddServiceId('')
  }

  const removeItem = (key: string) => {
    setItens((prev) => prev.filter((i) => i._key !== key))
  }

  const updateQty = (key: string, qty: number) => {
    setItens((prev) =>
      prev.map((i) => (i._key === key ? { ...i, quantidade: Math.max(1, qty) } : i))
    )
  }

  const handleSave = async () => {
    if (!form.nome.trim()) return
    const total = calcTotal(itens)
    const planoItens: PlanoItem[] = itens.map(({ servico_id, quantidade }) => ({
      servico_id,
      quantidade,
    }))
    try {
      if (editTarget) {
        await updatePlano.mutateAsync({
          id: editTarget.id,
          data: {
            nome: form.nome.trim(),
            descricao: form.descricao.trim() || undefined,
            ativo: form.ativo,
            valor: total,
            itens: planoItens,
          },
        })
        toast({ title: 'Plano atualizado' })
      } else {
        const novo: Plano = {
          id: uuidv4(),
          tenant_id: tenantId,
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || undefined,
          ativo: form.ativo,
          valor: total,
          itens: planoItens,
        }
        await createPlano.mutateAsync(novo)
        toast({ title: 'Plano criado' })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao salvar plano', variant: 'destructive' })
    }
  }

  const handleDelete = async (p: Plano) => {
    if (!confirm(`Excluir plano "${p.nome}"?`)) return
    try {
      await deletePlano.mutateAsync(p.id)
      toast({ title: 'Plano excluído' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const toggleAtivo = async (p: Plano) => {
    try {
      await updatePlano.mutateAsync({ id: p.id, data: { ativo: !p.ativo } })
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  // Serviços ainda não adicionados ao plano em edição
  const servicosDisponiveis = servicos?.filter(
    (s) => s.ativo && !itens.some((i) => i.servico_id === s.id)
  ) ?? []

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Planos</h3>
          <p className="text-sm text-muted-foreground">
            Pacotes de serviços para aplicar rapidamente em contratos de clientes.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Novo Plano
        </Button>
      </div>

      {!planos?.length ? (
        <EmptyState
          icon={Package}
          title="Nenhum plano cadastrado"
          description="Crie planos agrupando serviços para facilitar a composição de contratos."
          action={<Button onClick={openCreate}>Novo Plano</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {planos.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card px-4 py-3 space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex-1 min-w-48">
                  <p className="font-semibold text-sm">{p.nome}</p>
                  {p.descricao && (
                    <p className="text-xs text-muted-foreground">{p.descricao}</p>
                  )}
                </div>
                <span className="text-sm font-semibold shrink-0">{formatCurrency(p.valor)}</span>
                <button onClick={() => toggleAtivo(p)} className="shrink-0">
                  <Badge
                    className={
                      p.ativo
                        ? 'bg-green-100 text-green-800 border-transparent text-xs'
                        : 'bg-gray-100 text-gray-600 border-transparent text-xs'
                    }
                  >
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </button>
                <div className="flex items-center gap-1 ml-auto shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(p)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </div>
              {p.itens.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {p.itens.map((item) => (
                    <Badge key={item.servico_id} variant="outline" className="text-xs font-normal">
                      {item.quantidade > 1 && <span className="mr-1 font-semibold">{item.quantidade}×</span>}
                      {servicoNome(item.servico_id)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="plano-nome">Nome *</Label>
              <Input
                id="plano-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Plano Básico, Pacote Simples Nacional..."
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plano-desc">Descrição</Label>
              <Input
                id="plano-desc"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição opcional"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="plano-ativo" className="cursor-pointer">
                Plano ativo
              </Label>
              <Switch
                id="plano-ativo"
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
            </div>

            <Separator />

            {/* Itens do plano */}
            <div className="space-y-2">
              <Label>Serviços incluídos</Label>

              {itens.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum serviço adicionado.</p>
              ) : (
                <div className="space-y-1">
                  {itens.map((item) => (
                    <div
                      key={item._key}
                      className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span className="flex-1 font-medium truncate">
                        {servicoNome(item.servico_id)}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {formatCurrency(servicoValor(item.servico_id))}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Label className="text-xs text-muted-foreground">Qtd.</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) => updateQty(item._key, parseInt(e.target.value) || 1)}
                          className="w-16 h-7 text-sm"
                        />
                      </div>
                      <span className="font-semibold shrink-0 w-20 text-right">
                        {formatCurrency(servicoValor(item.servico_id) * item.quantidade)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item._key)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Adicionar serviço */}
              {servicosDisponiveis.length > 0 && (
                <div className="flex gap-2">
                  <Select value={addServiceId} onValueChange={setAddServiceId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Adicionar serviço..." />
                    </SelectTrigger>
                    <SelectContent>
                      {servicosDisponiveis.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome} — {formatCurrency(s.valor_padrao)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={addItem} disabled={!addServiceId}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Total */}
              {itens.length > 0 && (
                <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                  <span>Total do plano</span>
                  <span>{formatCurrency(calcTotal(itens))}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.nome.trim() || createPlano.isPending || updatePlano.isPending}
            >
              {editTarget ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
