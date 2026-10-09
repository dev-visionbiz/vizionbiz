import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import {
  Plus, Trash2, X, ArrowUp, ArrowDown, ListChecks, Check,
  Building2, Calculator, Users, FileText, Paperclip,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useUsers } from '@/data/hooks/useUsers'
import {
  useFluxos, useFluxoTarefas,
  useCreateFluxo, useUpdateFluxo, useDeleteFluxo,
  useCreateFluxoTarefa, useUpdateFluxoTarefa, useDeleteFluxoTarefa,
} from '@/data/hooks/useFluxos'
import type { Fluxo, CategoriaDemanda, OcorrenciaDocumentoConfig, OcorrenciaDocumentoTipo } from '@/domain/types'

// â”€â”€â”€ Tipos locais â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface FluxoFormData {
  nome: string
  descricao: string
  categoria: CategoriaDemanda
  prazo_dias_padrao: string
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
  documentos_config: OcorrenciaDocumentoConfig[]
}

interface EtapaFormData {
  nome: string
  descricao: string
  prazo_relativo_dias: string
  responsavel_padrao: string
  checklist: ChecklistItemForm[]
  documentos_config: OcorrenciaDocumentoConfig[]
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const categoriaLabel: Record<CategoriaDemanda, string> = {
  societario: 'Societário',
  fiscal: 'Fiscal',
  dp: 'Dep. Pessoal',
  contabil: 'Contábil',
  outros: 'Outros',
}

const defaultFluxoForm: FluxoFormData = {
  nome: '',
  descricao: '',
  categoria: 'fiscal',
  prazo_dias_padrao: '0',
  ativo: true,
}

const defaultEtapaForm: EtapaFormData = {
  nome: '',
  descricao: '',
  prazo_relativo_dias: '-5',
  responsavel_padrao: '',
  checklist: [],
  documentos_config: [],
}

function prazoLabel(dias: string) {
  const n = parseInt(dias)
  if (isNaN(n)) return ''
  return n > 0 ? `+${n}d` : `${n}d`
}

// â”€â”€â”€ CadastroFluxos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CadastroFluxos({ tenantId }: { tenantId: string }) {
  const { toast } = useToast()
  const { data: fluxos = [] } = useFluxos(tenantId)
  const { data: users = [] } = useUsers(tenantId)
  const createFluxo = useCreateFluxo()
  const updateFluxo = useUpdateFluxo()
  const deleteFluxo = useDeleteFluxo()
  const createEtapa = useCreateFluxoTarefa()
  const updateEtapa = useUpdateFluxoTarefa()
  const deleteEtapa = useDeleteFluxoTarefa()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editFluxo, setEditFluxo] = useState<Fluxo | null>(null)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FluxoFormData>(defaultFluxoForm)
  const [etapas, setEtapas] = useState<EtapaForm[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [etapaDialogOpen, setEtapaDialogOpen] = useState(false)
  const [etapaEditKey, setEtapaEditKey] = useState<string | null>(null)
  const [etapaForm, setEtapaForm] = useState<EtapaFormData>(defaultEtapaForm)

  const etapasQuery = useFluxoTarefas(tenantId, editFluxo?.id ?? '')
  const escritorioUsers = users.filter((u) => u.papel !== 'cliente' && u.ativo)

  // Popula etapas quando abre o dialog de edição (dados vêm do cache do React Query)
  useEffect(() => {
    if (!dialogOpen || !editFluxo || !etapasQuery.data) return
    setEtapas(
      etapasQuery.data.map((et) => ({
        _key: et.id,
        id: et.id,
        nome: et.nome,
        descricao: et.descricao ?? '',
        prazo_relativo_dias: String(et.prazo_relativo_dias),
        responsavel_padrao: et.responsavel_padrao ?? '',
        checklist: (et.checklist ?? []).map((c) => ({ id: c.id, nome: c.nome })),
        documentos_config: et.documentos_config ?? [],
      }))
    )
  }, [dialogOpen, editFluxo?.id, etapasQuery.data])

  // â”€â”€ Abrir dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function openCreate() {
    setEditFluxo(null)
    setForm({ ...defaultFluxoForm })
    setEtapas([])
    setStep(0)
    setDialogOpen(true)
  }

  function openEdit(fluxo: Fluxo) {
    setEditFluxo(fluxo)
    setForm({
      nome: fluxo.nome,
      descricao: fluxo.descricao ?? '',
      categoria: fluxo.categoria,
      prazo_dias_padrao: String(fluxo.prazo_dias_padrao),
      ativo: fluxo.ativo,
    })
    setEtapas([]) // preenchido pelo useEffect
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
      documentos_config: e.documentos_config.map((d) => ({ ...d })),
    })
    setEtapaDialogOpen(true)
  }

  function addEtapaDocSlot() {
    setEtapaForm((prev) => ({ ...prev, documentos_config: [...prev.documentos_config, { id: uuid(), label: '', tipo: 'saida' as OcorrenciaDocumentoTipo, obrigatorio: false }] }))
  }
  function removeEtapaDocSlot(id: string) {
    setEtapaForm((prev) => ({ ...prev, documentos_config: prev.documentos_config.filter((d) => d.id !== id) }))
  }
  function patchEtapaDocSlot(id: string, partial: Partial<OcorrenciaDocumentoConfig>) {
    setEtapaForm((prev) => ({ ...prev, documentos_config: prev.documentos_config.map((d) => d.id === id ? { ...d, ...partial } : d) }))
  }

  function saveEtapaForm() {
    if (!etapaForm.nome.trim()) return
    const docsValidos = etapaForm.documentos_config.filter((d) => d.label.trim())
    const formFinal = { ...etapaForm, documentos_config: docsValidos }
    if (etapaEditKey) {
      setEtapas((prev) => prev.map((e) => e._key === etapaEditKey ? { ...e, ...formFinal } : e))
    } else {
      setEtapas((prev) => [...prev, { _key: uuid(), ...formFinal }])
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

  // â”€â”€ Salvar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      documentos_config: e.documentos_config.length > 0 ? e.documentos_config : undefined,
    }
  }

  async function sincronizarEtapas(fluxoId: string) {
    const originais = etapasQuery.data ?? []
    const originaisIds = new Set(originais.map((e) => e.id))
    const currentIds = new Set(etapas.filter((e) => e.id).map((e) => e.id!))
    await Promise.all([
      ...originais.filter((e) => !currentIds.has(e.id)).map((e) => deleteEtapa.mutateAsync(e.id)),
      ...etapas
        .filter((e) => e.id && originaisIds.has(e.id))
        .map((e) => updateEtapa.mutateAsync({ id: e.id!, data: buildEtapaData(e, etapas.indexOf(e) + 1) })),
      ...etapas
        .filter((e) => !e.id)
        .map((e) => createEtapa.mutateAsync({ tenant_id: tenantId, fluxo_id: fluxoId, ...buildEtapaData(e, etapas.indexOf(e) + 1) })),
    ])
  }

  async function handleSalvar() {
    if (!form.nome.trim()) { setStep(0); return }
    setIsSaving(true)
    try {
      if (editFluxo) {
        await updateFluxo.mutateAsync({
          id: editFluxo.id,
          data: {
            nome: form.nome,
            descricao: form.descricao || undefined,
            categoria: form.categoria,
            prazo_dias_padrao: parseInt(form.prazo_dias_padrao) || 0,
            ativo: form.ativo,
          },
        })
        await sincronizarEtapas(editFluxo.id)
        toast({ title: 'Fluxo atualizado' })
      } else {
        await createFluxo.mutateAsync({
          fluxo: {
            tenant_id: tenantId,
            nome: form.nome,
            descricao: form.descricao || undefined,
            categoria: form.categoria,
            prazo_dias_padrao: parseInt(form.prazo_dias_padrao) || 0,
            ativo: form.ativo,
          },
          tarefas: etapas.map((e, i) => ({ tenant_id: tenantId, ...buildEtapaData(e, i + 1) })),
        })
        toast({ title: 'Fluxo criado' })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  function handleDelete(id: string) {
    deleteFluxo.mutate(id, { onSuccess: () => toast({ title: 'Fluxo excluído' }) })
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {fluxos.length} fluxo{fluxos.length !== 1 ? 's' : ''} cadastrado{fluxos.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Novo Fluxo</Button>
      </div>

      {fluxos.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">Nenhum fluxo cadastrado ainda.</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {fluxos.map((f) => (
          <FluxoRow
            key={f.id}
            fluxo={f}
            tenantId={tenantId}
            onEdit={() => openEdit(f)}
            onDelete={() => handleDelete(f.id)}
          />
        ))}
      </div>

      {/* â”€â”€ Dialog com stepper â”€â”€ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">

          {/* Cabeçalho */}
          <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b">
            <DialogTitle className="text-base">
              {editFluxo ? `Editar Fluxo â€” ${editFluxo.nome}` : 'Novo Fluxo'}
            </DialogTitle>

            {/* Stepper */}
            <div className="flex items-center mt-3">
              {(['Dados', 'Etapas'] as const).map((label, i) => (
                <div key={i} className={`flex items-center ${i < 1 ? 'flex-1' : ''}`}>
                  <button
                    type="button"
                    onClick={() => i <= step && setStep(i)}
                    className={[
                      'flex items-center gap-2 text-sm font-medium transition-colors shrink-0',
                      i === step
                        ? 'text-primary'
                        : i < step
                          ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                          : 'text-muted-foreground/40 cursor-default pointer-events-none',
                    ].join(' ')}
                  >
                    <span className={[
                      'flex h-6 w-6 rounded-full items-center justify-center text-xs font-bold border-2 transition-colors shrink-0',
                      i === step
                        ? 'border-primary bg-primary text-primary-foreground'
                        : i < step
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-muted-foreground/20 text-muted-foreground/40',
                    ].join(' ')}>
                      {i < step ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                    {i === 1 && etapas.length > 0 && (
                      <span className="hidden sm:inline bg-muted text-muted-foreground text-[10px] font-semibold rounded px-1 py-0.5 leading-none">
                        {etapas.length}
                      </span>
                    )}
                  </button>
                  {i < 1 && (
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
                    placeholder="Ex.: Abertura de Empresa"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Categoria</Label>
                    <Select
                      value={form.categoria}
                      onValueChange={(v) => setForm({ ...form, categoria: v as CategoriaDemanda })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(categoriaLabel) as [CategoriaDemanda, string][]).map(([val, lbl]) => (
                          <SelectItem key={val} value={val}>{lbl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prazo padrão (dias)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.prazo_dias_padrao}
                      onChange={(e) => setForm({ ...form, prazo_dias_padrao: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    placeholder="Descreva o propósito deste fluxoâ€¦"
                    className="resize-none text-sm"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="ativo"
                    checked={form.ativo}
                    onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
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
                        e.documentos_config.length > 0 ? `${e.documentos_config.length} doc${e.documentos_config.length > 1 ? 's' : ''}` : '',
                      ].filter(Boolean).join(' · ')

                      return (
                        <div
                          key={e._key}
                          className="flex items-center gap-2 border rounded-lg px-3 py-2.5 hover:bg-muted/30 cursor-pointer select-none"
                          onClick={() => openEtapaEdit(e)}
                        >
                          <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums text-right">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {e.nome || <span className="italic text-muted-foreground font-normal">Sem nome</span>}
                            </p>
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
            {step < 1 ? (
              <Button
                onClick={() => { if (form.nome.trim()) setStep((s) => s + 1) }}
                disabled={!form.nome.trim()}
              >
                Próximo â†’
              </Button>
            ) : (
              <Button onClick={handleSalvar} disabled={isSaving}>
                {editFluxo ? 'Salvar alterações' : 'Criar fluxo'}
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

          {/* Dois painéis em desktop */}
          <div className="flex-1 overflow-hidden flex flex-col sm:flex-row min-h-0">

            {/* Painel esquerdo â€” campos principais */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  autoFocus
                  value={etapaForm.nome}
                  onChange={(e) => setEtapaForm({ ...etapaForm, nome: e.target.value })}
                  placeholder="Ex.: Coletar documentos"
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

            {/* Painel direito â€” checklist + documentos */}
            <div className="sm:w-80 shrink-0 overflow-y-auto border-t sm:border-t-0 sm:border-l px-6 py-5 space-y-5 bg-muted/20">

              {/* Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4" />
                    Checklist
                    {etapaForm.checklist.length > 0 && (
                      <span className="text-muted-foreground font-normal text-xs">({etapaForm.checklist.length})</span>
                    )}
                  </Label>
                  <Button variant="outline" size="sm" onClick={addEtapaFormItem}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Item
                  </Button>
                </div>
                {etapaForm.checklist.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-1">
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

              <Separator />

              {/* Documentos esperados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4" />
                    Documentos
                    {etapaForm.documentos_config.length > 0 && (
                      <span className="text-muted-foreground font-normal text-xs">({etapaForm.documentos_config.length})</span>
                    )}
                  </Label>
                  <Button variant="outline" size="sm" onClick={addEtapaDocSlot}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Slot
                  </Button>
                </div>
                {etapaForm.documentos_config.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-1">
                    Defina documentos esperados nesta etapa (ex: guia emitida).
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {etapaForm.documentos_config.map((d) => (
                      <div key={d.id} className="border rounded-md p-2.5 space-y-2 bg-background">
                        <div className="flex gap-1.5">
                          <Input
                            value={d.label}
                            onChange={(e) => patchEtapaDocSlot(d.id, { label: e.target.value })}
                            placeholder="Ex: Guia DARF emitida"
                            className="flex-1 text-xs h-7"
                          />
                          <button
                            type="button"
                            onClick={() => removeEtapaDocSlot(d.id)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={d.tipo}
                            onValueChange={(v) => patchEtapaDocSlot(d.id, { tipo: v as OcorrenciaDocumentoTipo })}
                          >
                            <SelectTrigger className="h-7 text-xs flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="entrada" className="text-xs">Entrada</SelectItem>
                              <SelectItem value="saida" className="text-xs">Saída</SelectItem>
                              <SelectItem value="referencia" className="text-xs">Referência</SelectItem>
                            </SelectContent>
                          </Select>
                          <label className="flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer">
                            <Checkbox
                              checked={d.obrigatorio}
                              onCheckedChange={(v) => patchEtapaDocSlot(d.id, { obrigatorio: !!v })}
                              className="h-3.5 w-3.5"
                            />
                            Obrigatório
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground">Pasta padrão definida na criação da ocorrência</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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

// â”€â”€â”€ FluxoRow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const catConfig: Record<CategoriaDemanda, {
  gradient: string
  bar: string
  iconColor: string
  iconBg: string
  icon: React.ElementType
}> = {
  societario: { gradient: 'from-purple-500/15 to-transparent border-purple-400/30', bar: 'bg-purple-500',  iconColor: 'text-purple-600', iconBg: 'bg-purple-100 dark:bg-purple-500/20', icon: Building2  },
  fiscal:     { gradient: 'from-blue-500/15   to-transparent border-blue-400/30',   bar: 'bg-blue-500',    iconColor: 'text-blue-600',   iconBg: 'bg-blue-100   dark:bg-blue-500/20',   icon: Calculator },
  dp:         { gradient: 'from-green-500/15  to-transparent border-green-400/30',  bar: 'bg-green-500',   iconColor: 'text-green-600',  iconBg: 'bg-green-100  dark:bg-green-500/20',  icon: Users      },
  contabil:   { gradient: 'from-orange-500/15 to-transparent border-orange-400/30', bar: 'bg-orange-500',  iconColor: 'text-orange-600', iconBg: 'bg-orange-100 dark:bg-orange-500/20', icon: FileText   },
  outros:     { gradient: 'from-slate-500/10  to-transparent border-slate-400/30',  bar: 'bg-slate-400',   iconColor: 'text-slate-500',  iconBg: 'bg-slate-100  dark:bg-slate-500/20',  icon: FileText   },
}

function FluxoRow({
  fluxo, tenantId, onEdit, onDelete,
}: {
  fluxo: Fluxo
  tenantId: string
  onEdit: () => void
  onDelete: () => void
}) {
  const { data: etapas = [] } = useFluxoTarefas(tenantId, fluxo.id)
  const cfg = catConfig[fluxo.categoria]
  const Icon = cfg.icon

  return (
    <div
      className={`relative group border rounded-xl bg-linear-to-br ${cfg.gradient} cursor-pointer hover:shadow-md transition-all select-none overflow-hidden`}
      onClick={onEdit}
    >
      {/* barra de acento lateral */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.75 ${cfg.bar}`} />

      <div className="pl-4 pr-3 py-3.5 flex flex-col gap-2">
        {/* ícone + badge */}
        <div className="flex items-start justify-between gap-1.5">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
            <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
          </div>
          <Badge
            variant={fluxo.ativo ? 'default' : 'secondary'}
            className="text-[10px] px-1.5 py-0 h-4 shrink-0 mt-0.5"
          >
            {fluxo.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        {/* nome */}
        <p className="font-semibold text-sm leading-snug line-clamp-2">{fluxo.nome}</p>

        {/* categoria */}
        <span className="text-[11px] text-muted-foreground truncate">
          {categoriaLabel[fluxo.categoria]}
          {fluxo.descricao ? ` · ${fluxo.descricao}` : ''}
        </span>

        {/* rodapé: etapas + lixeira */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-muted-foreground">
            <ListChecks className="inline h-3 w-3 mr-1 opacity-60" />
            {etapas.length} etapa{etapas.length !== 1 ? 's' : ''}
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

// â”€â”€â”€ Página Principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function FluxosPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Fluxos</h1>
        <p className="text-muted-foreground text-sm">Templates de fluxo de trabalho e suas etapas</p>
      </div>
      <CadastroFluxos tenantId={tenantId} />

      <div className="h-16 rounded-xl border border-dashed border-border/40 bg-muted/20" />
    </div>
  )
}
