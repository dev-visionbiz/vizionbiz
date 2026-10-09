import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { v4 as uuid } from 'uuid'
import {
  Plus, Trash2, X,
  RefreshCw, Users, Calendar, Search, ArrowUp, ArrowDown, ListChecks, Check, LayoutDashboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useUsers } from '@/data/hooks/useUsers'
import {
  useFluxoTarefas, useCreateFluxoTarefa, useUpdateFluxoTarefa, useDeleteFluxoTarefa,
} from '@/data/hooks/useFluxos'
import {
  useRotinas, useCreateRotinaCompleta, useUpdateRotina, useDeleteRotina,
  useAllRotinaClientes, useCreateRotinaCliente, useDeleteRotinaCliente,
  useCiclos, useGerarCiclo, useUpdateCiclo,
} from '@/data/hooks/useRotinas'
import type { Rotina, RotinaCliente, Periodicidade } from '@/domain/types'
import PainelRotinaModal from '../Tarefas/PainelRotinaModal'
import CatalogoRotinasModal from '../Tarefas/CatalogoRotinasModal'

// â”€â”€â”€ Tipos locais do formulário â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface RotinaForm {
  nome: string
  periodicidade: Periodicidade
  regra_tipo: 'dia_mes_seguinte' | 'dia_mes_atual' | 'ultimo_dia_mes'
  regra_dia: string
  regime: string
  ativo: boolean
}

interface ChecklistItemForm {
  id: string
  nome: string
}

interface EtapaForm {
  _key: string
  id?: string
  nome: string
  descricao: string
  prazo_relativo_dias: string
  responsavel_padrao: string
  checklist: ChecklistItemForm[]
}

interface EtapaFormData {
  nome: string
  descricao: string
  prazo_relativo_dias: string
  responsavel_padrao: string
  checklist: ChecklistItemForm[]
}

const defaultEtapaForm: EtapaFormData = {
  nome: '',
  descricao: '',
  prazo_relativo_dias: '-5',
  responsavel_padrao: '',
  checklist: [],
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const periodicidadeLabel: Record<Periodicidade, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  anual: 'Anual',
}

const defaultForm: RotinaForm = {
  nome: '',
  periodicidade: 'mensal',
  regra_tipo: 'dia_mes_seguinte',
  regra_dia: '20',
  regime: '',
  ativo: true,
}

function buildRegraVencimento(f: RotinaForm): string {
  if (f.regra_tipo === 'ultimo_dia_mes') return JSON.stringify({ tipo: 'ultimo_dia_mes' })
  return JSON.stringify({ tipo: f.regra_tipo, dia: parseInt(f.regra_dia) || 20 })
}

function parseRegra(regra: string): Pick<RotinaForm, 'regra_tipo' | 'regra_dia'> {
  try {
    const r = JSON.parse(regra)
    return { regra_tipo: r.tipo ?? 'dia_mes_seguinte', regra_dia: String(r.dia ?? 20) }
  } catch {
    return { regra_tipo: 'dia_mes_seguinte', regra_dia: '20' }
  }
}

function mesAtual(): string {
  return format(new Date(), 'yyyy-MM')
}

function prazoLabel(dias: string) {
  const n = parseInt(dias)
  if (isNaN(n)) return ''
  return n > 0 ? `+${n}d` : `${n}d`
}

// â”€â”€â”€ Cadastro â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CadastroRotinas({ tenantId, onPainelRotinas }: { tenantId: string; onPainelRotinas?: () => void }) {
  const { toast } = useToast()
  const { data: rotinas = [] } = useRotinas(tenantId)
  const { data: clientes = [] } = useClients(tenantId)
  const { data: todos = [] } = useAllRotinaClientes(tenantId)
  const { data: users = [] } = useUsers(tenantId)
  const createRotina = useCreateRotinaCompleta()
  const updateRotina = useUpdateRotina()
  const deleteRotina = useDeleteRotina()
  const createVinculo = useCreateRotinaCliente()
  const deleteVinculo = useDeleteRotinaCliente()
  const createEtapa = useCreateFluxoTarefa()
  const updateEtapa = useUpdateFluxoTarefa()
  const deleteEtapa = useDeleteFluxoTarefa()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRotina, setEditRotina] = useState<Rotina | null>(null)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<RotinaForm>(defaultForm)
  const [etapas, setEtapas] = useState<EtapaForm[]>([])
  const [clientesSelecionados, setClientesSelecionados] = useState<Set<string>>(new Set())
  const [clienteSearch, setClienteSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [etapaDialogOpen, setEtapaDialogOpen] = useState(false)
  const [etapaEditKey, setEtapaEditKey] = useState<string | null>(null)
  const [etapaForm, setEtapaForm] = useState<EtapaFormData>(defaultEtapaForm)

  const etapasQuery = useFluxoTarefas(tenantId, editRotina?.fluxo_id ?? '')

  const escritorioUsers = users.filter((u) => u.papel !== 'cliente' && u.ativo)
  const clientesAtivos = clientes.filter((c) => c.status === 'ativo')
  const clientesFiltrados = clientesAtivos.filter((c) =>
    !clienteSearch || c.razao_social.toLowerCase().includes(clienteSearch.toLowerCase())
  )

  // Popula etapas quando abre o dialog de edição (dados vêm do cache do React Query)
  useEffect(() => {
    if (!dialogOpen || !editRotina || !etapasQuery.data) return
    setEtapas(
      etapasQuery.data.map((et) => ({
        _key: et.id,
        id: et.id,
        nome: et.nome,
        descricao: et.descricao ?? '',
        prazo_relativo_dias: String(et.prazo_relativo_dias),
        responsavel_padrao: et.responsavel_padrao ?? '',
        checklist: (et.checklist ?? []).map((c) => ({ id: c.id, nome: c.nome })),
      }))
    )
  }, [dialogOpen, editRotina?.id, etapasQuery.data])

  // â”€â”€ Abrir dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function openCreate() {
    setEditRotina(null)
    setForm({ ...defaultForm })
    setEtapas([])
    setClientesSelecionados(new Set())
    setClienteSearch('')
    setStep(0)
    setDialogOpen(true)
  }

  function openEdit(rotina: Rotina) {
    setEditRotina(rotina)
    setForm({ nome: rotina.nome, periodicidade: rotina.periodicidade, regime: rotina.regime ?? '', ativo: rotina.ativo, ...parseRegra(rotina.regra_vencimento) })
    setEtapas([]) // preenchido pelo useEffect acima
    setClientesSelecionados(new Set(todos.filter((v) => v.rotina_id === rotina.id).map((v) => v.cliente_id)))
    setClienteSearch('')
    setStep(0)
    setDialogOpen(true)
  }

  // â”€â”€ Etapas (lista) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function removeEtapa(key: string) {
    setEtapas((prev) => prev.filter((e) => e._key !== key))
  }

  function moveEtapa(key: string, dir: -1 | 1) {
    setEtapas((prev) => {
      const idx = prev.findIndex((e) => e._key === key)
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  // â”€â”€ Sub-modal de etapa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function openEtapaCreate() {
    setEtapaEditKey(null)
    setEtapaForm({ ...defaultEtapaForm })
    setEtapaDialogOpen(true)
  }

  function openEtapaEdit(e: EtapaForm) {
    setEtapaEditKey(e._key)
    setEtapaForm({
      nome: e.nome,
      descricao: e.descricao,
      prazo_relativo_dias: e.prazo_relativo_dias,
      responsavel_padrao: e.responsavel_padrao,
      checklist: e.checklist.map((c) => ({ ...c })),
    })
    setEtapaDialogOpen(true)
  }

  function saveEtapaForm() {
    if (!etapaForm.nome.trim()) return
    if (etapaEditKey) {
      setEtapas((prev) => prev.map((e) => e._key === etapaEditKey ? { ...e, ...etapaForm } : e))
    } else {
      setEtapas((prev) => [...prev, { _key: uuid(), ...etapaForm }])
    }
    setEtapaDialogOpen(false)
  }

  function addEtapaFormItem() {
    setEtapaForm((prev) => ({ ...prev, checklist: [...prev.checklist, { id: uuid(), nome: '' }] }))
  }

  function removeEtapaFormItem(itemId: string) {
    setEtapaForm((prev) => ({ ...prev, checklist: prev.checklist.filter((c) => c.id !== itemId) }))
  }

  function patchEtapaFormItem(itemId: string, nome: string) {
    setEtapaForm((prev) => ({ ...prev, checklist: prev.checklist.map((c) => c.id === itemId ? { ...c, nome } : c) }))
  }

  // â”€â”€ Salvar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function buildEtapaData(e: EtapaForm, ordem: number) {
    return {
      ordem,
      nome: e.nome,
      descricao: e.descricao || undefined,
      prazo_relativo_dias: parseInt(e.prazo_relativo_dias) || 0,
      responsavel_padrao: e.responsavel_padrao || undefined,
      checklist: e.checklist
        .filter((c) => c.nome.trim())
        .map((c, i) => ({ id: c.id, ordem: i + 1, nome: c.nome })),
    }
  }

  async function sincronizarEtapas(fluxoId: string) {
    const originais = etapasQuery.data ?? []
    const originaisIds = new Set(originais.map((e) => e.id))
    const currentIds = new Set(etapas.filter((e) => e.id).map((e) => e.id!))

    await Promise.all([
      // Deletar removidas
      ...originais.filter((e) => !currentIds.has(e.id)).map((e) => deleteEtapa.mutateAsync(e.id)),
      // Atualizar existentes
      ...etapas
        .filter((e) => e.id && originaisIds.has(e.id))
        .map((e) => updateEtapa.mutateAsync({ id: e.id!, data: buildEtapaData(e, etapas.indexOf(e) + 1) })),
      // Criar novas
      ...etapas
        .filter((e) => !e.id)
        .map((e) => createEtapa.mutateAsync({ tenant_id: tenantId, fluxo_id: fluxoId, ...buildEtapaData(e, etapas.indexOf(e) + 1) })),
    ])
  }

  async function sincronizarVinculos(rotinaId: string) {
    const vinculosAtuais = todos.filter((v) => v.rotina_id === rotinaId)
    const atuaisIds = new Set(vinculosAtuais.map((v) => v.cliente_id))
    await Promise.all([
      ...vinculosAtuais.filter((v) => !clientesSelecionados.has(v.cliente_id)).map((v) => deleteVinculo.mutateAsync(v.id)),
      ...Array.from(clientesSelecionados).filter((id) => !atuaisIds.has(id)).map((clienteId) =>
        createVinculo.mutateAsync({ tenant_id: tenantId, rotina_id: rotinaId, cliente_id: clienteId, ativo: true })
      ),
    ])
  }

  async function handleSalvar() {
    if (!form.nome.trim()) { setStep(0); return }
    setIsSaving(true)
    const regra_vencimento = buildRegraVencimento(form)
    try {
      if (editRotina) {
        await updateRotina.mutateAsync({
          id: editRotina.id,
          data: { nome: form.nome, periodicidade: form.periodicidade, regra_vencimento, regime: form.regime || undefined, ativo: form.ativo },
        })
        if (editRotina.fluxo_id) await sincronizarEtapas(editRotina.fluxo_id)
        await sincronizarVinculos(editRotina.id)
        toast({ title: 'Rotina atualizada' })
      } else {
        const novaRotina = await createRotina.mutateAsync({
          rotina: { tenant_id: tenantId, nome: form.nome, periodicidade: form.periodicidade, regra_vencimento, regime: form.regime || undefined, ativo: form.ativo },
          etapas: etapas.map((e, i) => buildEtapaData(e, i + 1)),
        })
        await sincronizarVinculos(novaRotina.id)
        toast({ title: 'Rotina criada' })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  function handleDelete(id: string) {
    deleteRotina.mutate(id, { onSuccess: () => toast({ title: 'Rotina excluída' }) })
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rotinas.length} rotina{rotinas.length !== 1 ? 's' : ''} cadastrada{rotinas.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          {onPainelRotinas && (
            <Button variant="outline" size="sm" onClick={onPainelRotinas}>
              <LayoutDashboard className="h-4 w-4 mr-1" />Painel de Rotinas
            </Button>
          )}
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Nova Rotina</Button>
        </div>
      </div>

      {rotinas.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">Nenhuma rotina cadastrada ainda.</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {rotinas.map((r) => (
          <RotinaRow
            key={r.id}
            rotina={r}
            tenantId={tenantId}
            todos={todos}
            onEdit={() => openEdit(r)}
            onDelete={() => handleDelete(r.id)}
          />
        ))}
      </div>

      {/* â”€â”€ Dialog com stepper â”€â”€ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">

          {/* Cabeçalho */}
          <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b">
            <DialogTitle className="text-base">
              {editRotina ? `Editar Rotina â€” ${editRotina.nome}` : 'Nova Rotina'}
            </DialogTitle>

            {/* Indicador de progresso */}
            <div className="flex items-center mt-3">
              {(['Dados', 'Etapas', 'Clientes'] as const).map((label, i) => (
                <div key={i} className={`flex items-center ${i < 2 ? 'flex-1' : ''}`}>
                  <button
                    type="button"
                    onClick={() => i <= step && setStep(i)}
                    className={[
                      'flex items-center gap-2 text-sm font-medium transition-colors shrink-0',
                      i === step ? 'text-primary' : i < step ? 'text-muted-foreground hover:text-foreground cursor-pointer' : 'text-muted-foreground/40 cursor-default pointer-events-none',
                    ].join(' ')}
                  >
                    <span className={[
                      'flex h-6 w-6 rounded-full items-center justify-center text-xs font-bold border-2 transition-colors shrink-0',
                      i === step ? 'border-primary bg-primary text-primary-foreground' : i < step ? 'border-primary/40 bg-primary/10 text-primary' : 'border-muted-foreground/20 text-muted-foreground/40',
                    ].join(' ')}>
                      {i < step ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                    {i === 1 && etapas.length > 0 && (
                      <span className="hidden sm:inline bg-muted text-muted-foreground text-[10px] font-semibold rounded px-1 py-0.5 leading-none">{etapas.length}</span>
                    )}
                    {i === 2 && clientesSelecionados.size > 0 && (
                      <span className="hidden sm:inline bg-muted text-muted-foreground text-[10px] font-semibold rounded px-1 py-0.5 leading-none">{clientesSelecionados.size}</span>
                    )}
                  </button>
                  {i < 2 && (
                    <div className={['flex-1 h-px mx-3 transition-colors', i < step ? 'bg-primary/30' : 'bg-muted-foreground/15'].join(' ')} />
                  )}
                </div>
              ))}
            </div>
          </DialogHeader>

          {/* Conteúdo do passo atual */}
          <div className="flex-1 overflow-y-auto">

            {/* Passo 1 â€” Dados */}
            {step === 0 && (
              <div className="px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input
                    autoFocus
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex.: PGDAS-D"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Periodicidade</Label>
                    <Select value={form.periodicidade} onValueChange={(v) => setForm({ ...form, periodicidade: v as Periodicidade })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Regime</Label>
                    <Input
                      value={form.regime}
                      onChange={(e) => setForm({ ...form, regime: e.target.value })}
                      placeholder="Ex.: Simples Nacional"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Regra de Vencimento</Label>
                  <div className="flex gap-2">
                    <Select
                      value={form.regra_tipo}
                      onValueChange={(v) => setForm({ ...form, regra_tipo: v as RotinaForm['regra_tipo'] })}
                    >
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dia_mes_seguinte">Dia do mês seguinte</SelectItem>
                        <SelectItem value="dia_mes_atual">Dia do mesmo mês</SelectItem>
                        <SelectItem value="ultimo_dia_mes">Ãšltimo dia do mês</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.regra_tipo !== 'ultimo_dia_mes' && (
                      <Input
                        type="number" min={1} max={31}
                        className="w-20"
                        value={form.regra_dia}
                        onChange={(e) => setForm({ ...form, regra_dia: e.target.value })}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="ativa"
                    checked={form.ativo}
                    onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                  />
                  <Label htmlFor="ativa">Ativa</Label>
                </div>
              </div>
            )}

            {/* Passo 2 â€” Etapas */}
            {step === 1 && (
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {etapas.length === 0
                      ? 'Nenhuma etapa ainda.'
                      : `${etapas.length} etapa${etapas.length !== 1 ? 's' : ''}`}
                  </p>
                  <Button variant="outline" size="sm" onClick={openEtapaCreate}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Nova Etapa
                  </Button>
                </div>

                {etapas.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg py-10 text-center text-sm text-muted-foreground">
                    Clique em "Nova Etapa" para adicionar etapas ao fluxo de trabalho.
                    <br /><span className="text-xs opacity-70">Opcional â€” você pode salvar sem etapas.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {etapas.map((e, idx) => {
                      const responsavelNome = escritorioUsers.find((u) => u.id === e.responsavel_padrao)?.nome
                      const meta = [
                        prazoLabel(e.prazo_relativo_dias),
                        responsavelNome,
                        e.checklist.length > 0 ? `${e.checklist.length} ${e.checklist.length === 1 ? 'item' : 'itens'}` : '',
                      ].filter(Boolean).join(' · ')

                      return (
                        <div
                          key={e._key}
                          className="flex items-center gap-2 border rounded-lg px-3 py-2.5 hover:bg-muted/30 cursor-pointer select-none"
                          onClick={() => openEtapaEdit(e)}
                        >
                          <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums text-right">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{e.nome || <span className="italic text-muted-foreground font-normal">Sem nome</span>}</p>
                            {meta && <p className="text-xs text-muted-foreground truncate">{meta}</p>}
                          </div>
                          <div className="flex gap-0.5 shrink-0" onClick={(evt) => evt.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" disabled={idx === 0} onClick={() => moveEtapa(e._key, -1)}>
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" disabled={idx === etapas.length - 1} onClick={() => moveEtapa(e._key, 1)}>
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removeEtapa(e._key)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Passo 3 â€” Clientes */}
            {step === 2 && (
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {clientesSelecionados.size === 0
                      ? 'Nenhum cliente vinculado.'
                      : `${clientesSelecionados.size} cliente${clientesSelecionados.size !== 1 ? 's' : ''} vinculado${clientesSelecionados.size !== 1 ? 's' : ''}`}
                  </p>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar clienteâ€¦"
                      className="h-8 pl-7 w-40 text-sm"
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                    />
                  </div>
                </div>

                {clientesAtivos.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg py-8 text-center text-sm text-muted-foreground">
                    Nenhum cliente ativo encontrado.
                  </div>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {clientesFiltrados.map((c) => (
                      <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer">
                        <Switch
                          checked={clientesSelecionados.has(c.id)}
                          onCheckedChange={() => {
                            setClientesSelecionados((prev) => {
                              const next = new Set(prev)
                              if (next.has(c.id)) next.delete(c.id)
                              else next.add(c.id)
                              return next
                            })
                          }}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{c.razao_social}</p>
                          {c.cnpj && <p className="text-xs text-muted-foreground">{c.cnpj}</p>}
                        </div>
                      </label>
                    ))}
                    {clientesFiltrados.length === 0 && (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum resultado para "{clienteSearch}".
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer de navegação */}
          <div className="px-6 py-4 border-t shrink-0 flex items-center gap-2">
            <Button variant="ghost" className="mr-auto text-muted-foreground" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                â† Voltar
              </Button>
            )}
            {step < 2 ? (
              <Button
                onClick={() => {
                  if (step === 0 && !form.nome.trim()) return
                  setStep((s) => s + 1)
                }}
                disabled={step === 0 && !form.nome.trim()}
              >
                Próximo â†’
              </Button>
            ) : (
              <Button onClick={handleSalvar} disabled={isSaving}>
                {editRotina ? 'Salvar alterações' : 'Criar rotina'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Sub-modal: criar / editar etapa â”€â”€ */}
      <Dialog open={etapaDialogOpen} onOpenChange={setEtapaDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b">
            <DialogTitle>{etapaEditKey ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
          </DialogHeader>

          {/* Corpo: dois painéis em desktop */}
          <div className="flex-1 overflow-hidden flex flex-col sm:flex-row min-h-0">

            {/* Painel esquerdo â€” campos principais */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  autoFocus
                  value={etapaForm.nome}
                  onChange={(e) => setEtapaForm({ ...etapaForm, nome: e.target.value })}
                  placeholder="Ex.: Transmitir PGDAS"
                  onKeyDown={(e) => e.key === 'Enter' && saveEtapaForm()}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prazo relativo (dias)</Label>
                  <Input
                    type="number"
                    value={etapaForm.prazo_relativo_dias}
                    onChange={(e) => setEtapaForm({ ...etapaForm, prazo_relativo_dias: e.target.value })}
                    placeholder="-5"
                  />
                  <p className="text-xs text-muted-foreground">Negativo = antes do vencimento</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Responsável padrão</Label>
                  <Select
                    value={etapaForm.responsavel_padrao || '__none__'}
                    onValueChange={(v) => setEtapaForm({ ...etapaForm, responsavel_padrao: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {escritorioUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea
                  value={etapaForm.descricao}
                  onChange={(e) => setEtapaForm({ ...etapaForm, descricao: e.target.value })}
                  placeholder="Instruções ou observações para esta etapaâ€¦"
                  className="resize-none text-sm"
                  rows={4}
                />
              </div>
            </div>

            {/* Painel direito â€” checklist */}
            <div className="sm:w-72 shrink-0 overflow-y-auto border-t sm:border-t-0 sm:border-l px-6 py-5 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4" />
                  Checklist
                  {etapaForm.checklist.length > 0 && (
                    <span className="text-muted-foreground font-normal text-xs">
                      ({etapaForm.checklist.length})
                    </span>
                  )}
                </Label>
                <Button variant="outline" size="sm" onClick={addEtapaFormItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Item
                </Button>
              </div>

              {etapaForm.checklist.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Use o checklist para dividir esta etapa em passos menores.
                </p>
              ) : (
                <div className="space-y-2">
                  {etapaForm.checklist.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-5 shrink-0 tabular-nums text-right">{i + 1}.</span>
                      <Input
                        value={item.nome}
                        onChange={(e) => patchEtapaFormItem(item.id, e.target.value)}
                        placeholder="Descrição do item"
                        className="flex-1 text-sm h-8"
                      />
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeEtapaFormItem(item.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEtapaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveEtapaForm} disabled={!etapaForm.nome.trim()}>
              {etapaEditKey ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// â”€â”€â”€ RotinaRow (somente leitura â€” edição via dialog unificado) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const periodicidadeGradient: Record<Periodicidade, string> = {
  mensal:      'from-sky-500/15   to-transparent border-sky-400/30',
  trimestral:  'from-teal-500/15  to-transparent border-teal-400/30',
  anual:       'from-violet-500/15 to-transparent border-violet-400/30',
}
const periodicidadeBar: Record<Periodicidade, string> = {
  mensal:     'bg-sky-500',
  trimestral: 'bg-teal-500',
  anual:      'bg-violet-500',
}
const periodicidadeDot: Record<Periodicidade, string> = {
  mensal:     'bg-sky-500',
  trimestral: 'bg-teal-500',
  anual:      'bg-violet-500',
}

function RotinaRow({
  rotina, tenantId, todos, onEdit, onDelete,
}: {
  rotina: Rotina
  tenantId: string
  todos: RotinaCliente[]
  onEdit: () => void
  onDelete: () => void
}) {
  const { data: etapas = [] } = useFluxoTarefas(tenantId, rotina.fluxo_id ?? '')
  const clientesCount = todos.filter((v) => v.rotina_id === rotina.id).length

  let regraLabel = 'â€”'
  try {
    const r = JSON.parse(rotina.regra_vencimento)
    if (r.tipo === 'ultimo_dia_mes') regraLabel = 'Ãšltimo dia'
    else if (r.tipo === 'dia_mes_seguinte') regraLabel = `Dia ${r.dia}/prox`
    else regraLabel = `Dia ${r.dia}`
  } catch { /* empty */ }

  return (
    <div
      className={`relative group border rounded-xl bg-linear-to-br ${periodicidadeGradient[rotina.periodicidade]} cursor-pointer hover:shadow-md transition-all select-none overflow-hidden`}
      onClick={onEdit}
    >
      {/* barra de acento lateral */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.75 ${periodicidadeBar[rotina.periodicidade]}`} />

      <div className="pl-4 pr-3 py-3.5 flex flex-col gap-2">
        {/* nome + status */}
        <div className="flex items-start justify-between gap-1.5">
          <p className="font-semibold text-sm leading-snug line-clamp-2">{rotina.nome}</p>
          <Badge
            variant={rotina.ativo ? 'default' : 'secondary'}
            className="text-[10px] px-1.5 py-0 h-4 shrink-0 mt-0.5"
          >
            {rotina.ativo ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>

        {/* periodicidade + regra */}
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${periodicidadeDot[rotina.periodicidade]}`} />
          <span className="text-[11px] text-muted-foreground truncate">
            {periodicidadeLabel[rotina.periodicidade]} · {regraLabel}
            {rotina.regime ? ` · ${rotina.regime}` : ''}
          </span>
        </div>

        {/* rodapé: etapas · clientes + lixeira */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span>
              <ListChecks className="inline h-3 w-3 mr-0.5 opacity-60" />
              {etapas.length}
            </span>
            <span>
              <Users className="inline h-3 w-3 mr-0.5 opacity-60" />
              {clientesCount}
            </span>
          </span>
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost" size="sm"
              className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€ Ciclos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PainelCiclos({ tenantId }: { tenantId: string }) {
  const { toast } = useToast()
  const { data: rotinas = [] } = useRotinas(tenantId)
  const gerarCiclo = useGerarCiclo()
  const updateCiclo = useUpdateCiclo()

  const [rotinaId, setRotinaId] = useState<string>('')
  const [periodo, setPeriodo] = useState(mesAtual())

  const { data: ciclos = [] } = useCiclos(tenantId, rotinaId)
  const rotinaAtual = rotinas.find((r) => r.id === rotinaId)

  function handleGerar() {
    if (!rotinaAtual || !periodo) return
    gerarCiclo.mutate(
      { tenantId, rotina: rotinaAtual, periodo },
      {
        onSuccess: ({ ciclo, ocorrenciasCriadas, tarefasCriadas }) => {
          if (ocorrenciasCriadas > 0) {
            toast({
              title: 'Ciclo gerado',
              description: `${ocorrenciasCriadas} ocorrência${ocorrenciasCriadas !== 1 ? 's' : ''} e ${tarefasCriadas} tarefa${tarefasCriadas !== 1 ? 's' : ''} criadas`,
            })
          } else {
            toast({ title: 'Ciclo já existe', description: `Nenhuma ocorrência nova para ${ciclo.periodo}` })
          }
        },
        onError: () => toast({ title: 'Erro ao gerar ciclo', variant: 'destructive' }),
      }
    )
  }

  const ciclosOrdenados = [...ciclos].sort((a, b) => b.periodo.localeCompare(a.periodo))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5">
          <Label>Rotina</Label>
          <Select value={rotinaId} onValueChange={setRotinaId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {rotinas.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Período (AAAA-MM)</Label>
          <Input
            className="w-36"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            placeholder="2026-09"
          />
        </div>
        <Button onClick={handleGerar} disabled={!rotinaId || !periodo || gerarCiclo.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${gerarCiclo.isPending ? 'animate-spin' : ''}`} />
          Gerar Ciclo
        </Button>
      </div>

      {rotinaId && (
        <>
          <Separator />
          {ciclosOrdenados.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum ciclo gerado para esta rotina.</p>
          ) : (
            <div className="space-y-2">
              {ciclosOrdenados.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border rounded-md px-4 py-2.5">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.periodo}</p>
                    <p className="text-xs text-muted-foreground">
                      Vencimento: {format(parseISO(c.data_vencimento), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <Badge variant={c.status === 'encerrada' ? 'secondary' : 'outline'} className="text-xs">
                    {c.status === 'encerrada' ? 'Encerrado' : 'Aberto'}
                  </Badge>
                  {c.status === 'aberta' && (
                    <Button
                      variant="outline" size="sm" className="h-7 text-xs"
                      onClick={() => updateCiclo.mutate(
                        { id: c.id, data: { status: 'encerrada' } },
                        { onSuccess: () => toast({ title: 'Ciclo encerrado' }) }
                      )}
                    >
                      Encerrar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!rotinaId && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Selecione uma rotina para ver e gerar ciclos.
        </p>
      )}
    </div>
  )
}

// â”€â”€â”€ Página Principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function RotinasPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const [catalogoOpen, setCatalogoOpen] = useState(false)
  const [painelRotina, setPainelRotina] = useState<{ rotinaId: string; cicloId: string } | null>(null)

  function handleSelectRotina(rotinaId: string, cicloId: string) {
    setCatalogoOpen(false)
    setPainelRotina({ rotinaId, cicloId })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Rotinas</h1>
        <p className="text-muted-foreground text-sm">Obrigações recorrentes e geração de ciclos</p>
      </div>

      <CadastroRotinas tenantId={tenantId} onPainelRotinas={() => setCatalogoOpen(true)} />

      <CatalogoRotinasModal
        open={catalogoOpen}
        onClose={() => setCatalogoOpen(false)}
        onSelectRotina={handleSelectRotina}
      />
      {painelRotina && (
        <PainelRotinaModal
          open={!!painelRotina}
          onClose={() => setPainelRotina(null)}
          rotinaId={painelRotina.rotinaId}
          cicloId={painelRotina.cicloId}
        />
      )}

      <div className="h-16 rounded-xl border border-dashed border-border/40 bg-muted/20" />
    </div>
  )
}
