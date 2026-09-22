import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useAuth } from '@/auth/AuthProvider'
import {
  useObrigacoes, useCreateObrigacao, useUpdateObrigacao, useDeleteObrigacao,
} from '@/data/hooks/useObrigacoes'
import {
  useEtapasObrigacao, useCreateEtapa, useUpdateEtapa, useDeleteEtapa, useReorderEtapas,
} from '@/data/hooks/useEtapasObrigacao'
import { useUsers } from '@/data/hooks/useUsers'
import type { Obrigacao, EtapaObrigacao, Periodicidade } from '@/domain/types'

const periodicidadeLabel: Record<Periodicidade, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  anual: 'Anual',
}

interface ObrigacaoForm {
  nome: string
  periodicidade: Periodicidade
  regra_tipo: 'dia_mes_seguinte' | 'dia_mes_atual' | 'ultimo_dia_mes'
  regra_dia: string
  regime: string
  ativo: boolean
}

const defaultObrigacaoForm: ObrigacaoForm = {
  nome: '',
  periodicidade: 'mensal',
  regra_tipo: 'dia_mes_seguinte',
  regra_dia: '20',
  regime: '',
  ativo: true,
}

interface EtapaForm {
  nome: string
  prazo_relativo_dias: string
  responsavel_padrao: string
  descricao: string
}

const defaultEtapaForm: EtapaForm = {
  nome: '',
  prazo_relativo_dias: '-5',
  responsavel_padrao: '',
  descricao: '',
}

function buildRegraVencimento(form: ObrigacaoForm): string {
  if (form.regra_tipo === 'ultimo_dia_mes') return JSON.stringify({ tipo: 'ultimo_dia_mes' })
  return JSON.stringify({ tipo: form.regra_tipo, dia: parseInt(form.regra_dia) || 20 })
}

function parseRegraForForm(regra: string): Pick<ObrigacaoForm, 'regra_tipo' | 'regra_dia'> {
  try {
    const r = JSON.parse(regra)
    return { regra_tipo: r.tipo ?? 'dia_mes_seguinte', regra_dia: String(r.dia ?? 20) }
  } catch {
    return { regra_tipo: 'dia_mes_seguinte', regra_dia: '20' }
  }
}

function EtapasSection({ obrigacaoId, tenantId }: { obrigacaoId: string; tenantId: string }) {
  const { data: etapas = [] } = useEtapasObrigacao(tenantId, obrigacaoId)
  const { data: users = [] } = useUsers(tenantId)
  const createEtapa = useCreateEtapa()
  const updateEtapa = useUpdateEtapa()
  const deleteEtapa = useDeleteEtapa()
  const reorderEtapas = useReorderEtapas()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<EtapaForm>(defaultEtapaForm)

  const escritorioUsers = users.filter((u) => u.papel !== 'cliente' && u.ativo)

  function openCreate() {
    setEditId(null)
    setForm({ ...defaultEtapaForm })
    setDialogOpen(true)
  }

  function openEdit(etapa: EtapaObrigacao) {
    setEditId(etapa.id)
    setForm({
      nome: etapa.nome,
      prazo_relativo_dias: String(etapa.prazo_relativo_dias),
      responsavel_padrao: etapa.responsavel_padrao ?? '',
      descricao: etapa.descricao ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    const data = {
      nome: form.nome.trim(),
      prazo_relativo_dias: parseInt(form.prazo_relativo_dias) || 0,
      responsavel_padrao: form.responsavel_padrao || undefined,
      descricao: form.descricao.trim() || undefined,
    }
    if (editId) {
      await updateEtapa.mutateAsync({ id: editId, data })
    } else {
      await createEtapa.mutateAsync({
        tenant_id: tenantId,
        obrigacao_id: obrigacaoId,
        ordem: etapas.length + 1,
        ...data,
      })
    }
    setDialogOpen(false)
  }

  async function handleMove(etapa: EtapaObrigacao, dir: 'up' | 'down') {
    const idx = etapas.findIndex((e) => e.id === etapa.id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === etapas.length - 1) return
    const reordered = [...etapas]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[reordered[idx], reordered[swap]] = [reordered[swap], reordered[idx]]
    await reorderEtapas.mutateAsync(reordered)
  }

  const canSave = form.nome.trim() !== ''

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Etapas</span>
        <Button size="sm" variant="outline" onClick={openCreate} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> Etapa
        </Button>
      </div>

      {etapas.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nenhuma etapa cadastrada.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {etapas.map((etapa, idx) => (
            <div key={etapa.id} className="flex items-center gap-2 px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <button
                  className="p-0.5 hover:text-foreground text-muted-foreground disabled:opacity-30"
                  onClick={() => handleMove(etapa, 'up')}
                  disabled={idx === 0}
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  className="p-0.5 hover:text-foreground text-muted-foreground disabled:opacity-30"
                  onClick={() => handleMove(etapa, 'down')}
                  disabled={idx === etapas.length - 1}
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <span className="w-5 text-xs text-muted-foreground text-right">{etapa.ordem}.</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm">{etapa.nome}</span>
                {etapa.descricao && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{etapa.descricao}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {etapa.prazo_relativo_dias === 0
                  ? 'no vencimento'
                  : etapa.prazo_relativo_dias < 0
                  ? `${Math.abs(etapa.prazo_relativo_dias)}d antes`
                  : `${etapa.prazo_relativo_dias}d depois`}
              </span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEdit(etapa)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={() => { if (confirm('Excluir etapa?')) deleteEtapa.mutate(etapa.id) }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nome da etapa *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Calcular e transmitir PGDAS"
              />
            </div>
            <div className="space-y-1">
              <Label>Prazo relativo (dias)</Label>
              <Input
                type="number"
                value={form.prazo_relativo_dias}
                onChange={(e) => setForm((f) => ({ ...f, prazo_relativo_dias: e.target.value }))}
                placeholder="-5 (antes) ou 0 (no vencimento)"
              />
              <p className="text-xs text-muted-foreground">Negativo = antes do vencimento. 0 = no vencimento.</p>
            </div>
            <div className="space-y-1">
              <Label>Responsável padrão</Label>
              <Select
                value={form.responsavel_padrao}
                onValueChange={(v) => setForm((f) => ({ ...f, responsavel_padrao: v === '_none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável padrão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem responsável padrão</SelectItem>
                  {escritorioUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Instruções / informativo</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Texto de orientação exibido ao executar esta etapa (opcional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!canSave || createEtapa.isPending || updateEtapa.isPending}>
              {editId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function CadastroObrigacoes() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const { data: obrigacoes = [], isLoading } = useObrigacoes(tenantId)
  const createObrigacao = useCreateObrigacao()
  const updateObrigacao = useUpdateObrigacao()
  const deleteObrigacao = useDeleteObrigacao()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ObrigacaoForm>(defaultObrigacaoForm)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function openCreate() {
    setEditId(null)
    setForm({ ...defaultObrigacaoForm })
    setDialogOpen(true)
  }

  function openEdit(o: Obrigacao) {
    setEditId(o.id)
    const parsed = parseRegraForForm(o.regra_vencimento)
    setForm({
      nome: o.nome,
      periodicidade: o.periodicidade,
      regra_tipo: parsed.regra_tipo,
      regra_dia: parsed.regra_dia,
      regime: o.regime ?? '',
      ativo: o.ativo,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    const data = {
      nome: form.nome.trim(),
      periodicidade: form.periodicidade,
      regra_vencimento: buildRegraVencimento(form),
      regime: form.regime.trim() || undefined,
      ativo: form.ativo,
    }
    if (editId) {
      await updateObrigacao.mutateAsync({ id: editId, data })
    } else {
      await createObrigacao.mutateAsync({ tenant_id: tenantId, ...data })
    }
    setDialogOpen(false)
  }

  const canSave = form.nome.trim() !== ''

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>

  return (
    <div className="px-4 sm:px-6 pb-8">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {obrigacoes.length} obrigação{obrigacoes.length !== 1 ? 's' : ''} cadastrada{obrigacoes.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Obrigação
        </Button>
      </div>

      {obrigacoes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhuma obrigação cadastrada ainda.</p>
          <Button variant="outline" className="mt-3" onClick={openCreate}>
            Cadastrar primeira obrigação
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {obrigacoes.map((o) => (
            <div key={o.id} className="rounded-lg border bg-card">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                >
                  {expandedId === o.id
                    ? <ChevronDown className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />}
                </button>
                <span className="flex-1 font-medium text-sm">{o.nome}</span>
                <Badge variant="outline" className="text-xs">{periodicidadeLabel[o.periodicidade]}</Badge>
                {o.regime && <Badge variant="secondary" className="text-xs">{o.regime}</Badge>}
                {!o.ativo && <Badge className="text-xs bg-gray-100 text-gray-600 border-transparent">Inativa</Badge>}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(o)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => { if (confirm(`Excluir "${o.nome}"?`)) deleteObrigacao.mutate(o.id) }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {expandedId === o.id && (
                <div className="border-t px-4 pb-4">
                  <EtapasSection obrigacaoId={o.id} tenantId={tenantId} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Obrigação' : 'Nova Obrigação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: PGDAS-D"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Periodicidade</Label>
                <Select
                  value={form.periodicidade}
                  onValueChange={(v) => setForm((f) => ({ ...f, periodicidade: v as Periodicidade }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Regime</Label>
                <Input
                  value={form.regime}
                  onChange={(e) => setForm((f) => ({ ...f, regime: e.target.value }))}
                  placeholder="Ex: Simples Nacional"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Regra de vencimento</Label>
              <Select
                value={form.regra_tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, regra_tipo: v as ObrigacaoForm['regra_tipo'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia_mes_seguinte">Dia fixo do mês seguinte</SelectItem>
                  <SelectItem value="dia_mes_atual">Dia fixo do mês atual</SelectItem>
                  <SelectItem value="ultimo_dia_mes">Último dia do mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.regra_tipo !== 'ultimo_dia_mes' && (
              <div className="space-y-1">
                <Label>Dia do mês</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.regra_dia}
                  onChange={(e) => setForm((f) => ({ ...f, regra_dia: e.target.value }))}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
              <Label>Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || createObrigacao.isPending || updateObrigacao.isPending}
            >
              {editId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
