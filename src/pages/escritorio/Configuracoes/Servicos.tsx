import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { useServicos, useCreateServico, useUpdateServico, useDeleteServico } from '@/data/hooks/useServicos'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Pencil, Trash2, Plus, Wrench } from 'lucide-react'
import type { Servico, TipoCobrancaServico } from '@/domain/types'
import { formatCurrency } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

const tipoLabel: Record<TipoCobrancaServico, string> = {
  mensal: 'Mensal',
  avulso: 'Avulso',
}

const emptyForm = {
  nome: '',
  descricao: '',
  valor_padrao: '',
  tipo_cobranca_padrao: 'mensal' as TipoCobrancaServico,
  ativo: true,
}

export default function Servicos() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: servicos, isLoading } = useServicos(tenantId)
  const createServico = useCreateServico()
  const updateServico = useUpdateServico()
  const deleteServico = useDeleteServico()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Servico | null>(null)
  const [form, setForm] = useState(emptyForm)

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (s: Servico) => {
    setEditTarget(s)
    setForm({
      nome: s.nome,
      descricao: s.descricao ?? '',
      valor_padrao: String(s.valor_padrao),
      tipo_cobranca_padrao: s.tipo_cobranca_padrao,
      ativo: s.ativo,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.nome.trim() || !form.valor_padrao) return
    const data = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || undefined,
      valor_padrao: parseFloat(form.valor_padrao),
      tipo_cobranca_padrao: form.tipo_cobranca_padrao,
      ativo: form.ativo,
    }
    try {
      if (editTarget) {
        await updateServico.mutateAsync({ id: editTarget.id, data })
        toast({ title: 'Serviço atualizado' })
      } else {
        await createServico.mutateAsync({
          id: uuidv4(),
          tenant_id: tenantId,
          ...data,
          descricao: data.descricao,
        } as Servico)
        toast({ title: 'Serviço criado' })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao salvar serviço', variant: 'destructive' })
    }
  }

  const handleDelete = async (s: Servico) => {
    if (!confirm(`Excluir serviço "${s.nome}"?`)) return
    try {
      await deleteServico.mutateAsync(s.id)
      toast({ title: 'Serviço excluído' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const toggleAtivo = async (s: Servico) => {
    try {
      await updateServico.mutateAsync({ id: s.id, data: { ativo: !s.ativo } })
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Serviços</h3>
          <p className="text-sm text-muted-foreground">
            Catálogo de serviços disponíveis para compor contratos e planos.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Novo Serviço
        </Button>
      </div>

      {!servicos?.length ? (
        <EmptyState
          icon={Wrench}
          title="Nenhum serviço cadastrado"
          description="Cadastre os serviços do escritório para usar nos contratos dos clientes."
          action={<Button onClick={openCreate}>Novo Serviço</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {servicos.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border bg-card px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <div className="flex-1 min-w-48">
                <p className="font-semibold text-sm">{s.nome}</p>
                {s.descricao && (
                  <p className="text-xs text-muted-foreground">{s.descricao}</p>
                )}
              </div>
              <Badge
                className={
                  s.tipo_cobranca_padrao === 'mensal'
                    ? 'bg-blue-100 text-blue-800 border-transparent text-xs shrink-0'
                    : 'bg-orange-100 text-orange-800 border-transparent text-xs shrink-0'
                }
              >
                {tipoLabel[s.tipo_cobranca_padrao]}
              </Badge>
              <span className="text-sm font-medium shrink-0">{formatCurrency(s.valor_padrao)}</span>
              <button onClick={() => toggleAtivo(s)} className="shrink-0">
                <Badge
                  className={
                    s.ativo
                      ? 'bg-green-100 text-green-800 border-transparent text-xs'
                      : 'bg-gray-100 text-gray-600 border-transparent text-xs'
                  }
                >
                  {s.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </button>
              <div className="flex items-center gap-1 ml-auto shrink-0">
                <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(s)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="svc-nome">Nome *</Label>
              <Input
                id="svc-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Escrituração Fiscal"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="svc-desc">Descrição</Label>
              <Input
                id="svc-desc"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição opcional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="svc-valor">Valor padrão (R$) *</Label>
                <Input
                  id="svc-valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor_padrao}
                  onChange={(e) => setForm((f) => ({ ...f, valor_padrao: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo de cobrança</Label>
                <Select
                  value={form.tipo_cobranca_padrao}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, tipo_cobranca_padrao: v as TipoCobrancaServico }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="avulso">Avulso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="svc-ativo" className="cursor-pointer">
                Serviço ativo
              </Label>
              <Switch
                id="svc-ativo"
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.nome.trim() || !form.valor_padrao}
            >
              {editTarget ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
