import { useState, useEffect, useMemo } from 'react'
import { v4 as uuid } from 'uuid'
import { format, addDays } from 'date-fns'
import {
  Plus, Trash2, Pencil, X, ListChecks,
  Building2, FileText, Users, Calculator,
  CheckSquare, Square, Layers, Check, Paperclip,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useUsers } from '@/data/hooks/useUsers'
import { useFluxosAtivos, useFluxoTarefas } from '@/data/hooks/useFluxos'
import { useRotinas } from '@/data/hooks/useRotinas'
import { useCreateOcorrencia, useCreateOcorrenciasLote } from '@/data/hooks/useOcorrencias'
import { useClientFolders } from '@/data/hooks/useFolders'
import type { CategoriaDemanda, OcorrenciaDocumentoConfig, OcorrenciaDocumentoTipo } from '@/domain/types'

const categoriaConfig: Record<CategoriaDemanda, {
  label: string; icon: React.ElementType
  iconColor: string; iconBg: string
  gradient: string; bar: string
}> = {
  societario: { label: 'Societário',   icon: Building2,  iconColor: 'text-purple-600', iconBg: 'bg-purple-100 dark:bg-purple-500/20', gradient: 'from-purple-500/15 to-transparent border-purple-400/30', bar: 'bg-purple-500'  },
  fiscal:     { label: 'Fiscal',       icon: Calculator, iconColor: 'text-blue-600',   iconBg: 'bg-blue-100   dark:bg-blue-500/20',   gradient: 'from-blue-500/15   to-transparent border-blue-400/30',   bar: 'bg-blue-500'    },
  dp:         { label: 'Dep. Pessoal', icon: Users,      iconColor: 'text-green-600',  iconBg: 'bg-green-100  dark:bg-green-500/20',  gradient: 'from-green-500/15  to-transparent border-green-400/30',  bar: 'bg-green-500'   },
  contabil:   { label: 'Contábil',     icon: FileText,   iconColor: 'text-orange-600', iconBg: 'bg-orange-100 dark:bg-orange-500/20', gradient: 'from-orange-500/15 to-transparent border-orange-400/30', bar: 'bg-orange-500'  },
  outros:     { label: 'Outros',       icon: FileText,   iconColor: 'text-slate-500',  iconBg: 'bg-slate-100  dark:bg-slate-500/20',  gradient: 'from-slate-500/10  to-transparent border-slate-400/30',  bar: 'bg-slate-400'   },
}

interface ChecklistItemForm {
  id: string
  nome: string
  origem: 'template' | 'custom'
}

interface TarefaEditavel {
  _id: string
  nome: string
  descricao: string
  prazo_relativo_dias: number
  responsavel_id: string
  checklist: ChecklistItemForm[]
  documentos_config: OcorrenciaDocumentoConfig[]
}

// ─── Sub-dialog de tarefa ─────────────────────────────────────────────────────

interface TarefaEditavelDialogProps {
  tarefa: TarefaEditavel | null
  ordem: number
  colaboradores: { id: string; nome: string }[]
  tenantId: string
  clienteId?: string
  onClose: () => void
  onSalvar: (data: Partial<TarefaEditavel> & { nome: string; prazo_relativo_dias: number }) => void
}

function TarefaEditavelDialog({ tarefa, ordem, colaboradores, tenantId, clienteId, onClose, onSalvar }: TarefaEditavelDialogProps) {
  const { toast } = useToast()
  const [nome, setNome]           = useState(tarefa?.nome ?? '')
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? '')
  const [prazoDias, setPrazoDias] = useState(tarefa?.prazo_relativo_dias ?? 0)
  const [respId, setRespId]       = useState(tarefa?.responsavel_id ?? '')
  const [checklist, setChecklist] = useState<ChecklistItemForm[]>(tarefa?.checklist ?? [])
  const [docsConfig, setDocsConfig] = useState<OcorrenciaDocumentoConfig[]>(tarefa?.documentos_config ?? [])

  const { data: pastas = [] } = useClientFolders(tenantId, clienteId ?? '')

  function addItem() {
    setChecklist(prev => [...prev, { id: uuid(), nome: '', origem: 'custom' }])
  }
  function removeItem(id: string) {
    setChecklist(prev => prev.filter(c => c.id !== id))
  }
  function patchItem(id: string, nome: string) {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, nome } : c))
  }

  function addDocSlot() {
    setDocsConfig(prev => [...prev, { id: uuid(), label: '', tipo: 'saida', obrigatorio: false }])
  }
  function removeDocSlot(id: string) {
    setDocsConfig(prev => prev.filter(d => d.id !== id))
  }
  function patchDocSlot(id: string, partial: Partial<OcorrenciaDocumentoConfig>) {
    setDocsConfig(prev => prev.map(d => d.id === id ? { ...d, ...partial } : d))
  }

  function handleSalvar() {
    if (!nome.trim()) return toast({ title: 'Informe o nome da tarefa', variant: 'destructive' })
    const docsValidos = docsConfig.filter(d => d.label.trim())
    onSalvar({ _id: tarefa?._id, nome: nome.trim(), descricao, prazo_relativo_dias: prazoDias, responsavel_id: respId, checklist, documentos_config: docsValidos })
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b">
          <DialogTitle>
            {tarefa ? `Tarefa ${ordem} — ${tarefa.nome || 'sem nome'}` : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>

        {/* Dois painéis em desktop */}
        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row min-h-0">

          {/* Painel esquerdo — campos principais */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Reunião com cliente"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSalvar()}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prazo relativo (dias)</Label>
                <Input
                  type="number"
                  value={prazoDias}
                  onChange={e => setPrazoDias(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Negativo = antes do vencimento</p>
              </div>
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select value={respId} onValueChange={setRespId}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {colaboradores.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Instruções</Label>
              <Textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Orientações para executar esta tarefa..."
                className="resize-none text-sm"
                rows={4}
              />
            </div>
          </div>

          {/* Painel direito — checklist + documentos */}
          <div className="sm:w-80 shrink-0 overflow-y-auto border-t sm:border-t-0 sm:border-l px-6 py-5 space-y-5 bg-muted/20">

            {/* Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4" />
                  Checklist
                  {checklist.length > 0 && (
                    <span className="text-muted-foreground font-normal text-xs">({checklist.length})</span>
                  )}
                </Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Item
                </Button>
              </div>
              {checklist.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">
                  Use o checklist para dividir esta tarefa em passos menores.
                </p>
              ) : (
                <div className="space-y-2">
                  {checklist.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-5 shrink-0 tabular-nums text-right">{i + 1}.</span>
                      <Input
                        value={item.nome}
                        onChange={e => patchItem(item.id, e.target.value)}
                        placeholder="Descrição do item"
                        className="flex-1 text-sm h-8"
                      />
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeItem(item.id)}
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
                  {docsConfig.length > 0 && (
                    <span className="text-muted-foreground font-normal text-xs">({docsConfig.length})</span>
                  )}
                </Label>
                <Button variant="outline" size="sm" onClick={addDocSlot}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Slot
                </Button>
              </div>
              {docsConfig.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">
                  Defina documentos esperados nesta tarefa (ex: guia emitida).
                </p>
              ) : (
                <div className="space-y-2.5">
                  {docsConfig.map(d => (
                    <div key={d.id} className="border rounded-md p-2.5 space-y-2 bg-background">
                      <div className="flex gap-1.5">
                        <Input
                          value={d.label}
                          onChange={e => patchDocSlot(d.id, { label: e.target.value })}
                          placeholder="Ex: Guia DARF emitida"
                          className="flex-1 text-xs h-7"
                        />
                        <button
                          type="button"
                          onClick={() => removeDocSlot(d.id)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={d.tipo}
                          onValueChange={v => patchDocSlot(d.id, { tipo: v as OcorrenciaDocumentoTipo })}
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
                            onCheckedChange={v => patchDocSlot(d.id, { obrigatorio: !!v })}
                            className="h-3.5 w-3.5"
                          />
                          Obrigatório
                        </label>
                      </div>
                      {clienteId && pastas.length > 0 && (
                        <Select
                          value={d.pasta_padrao_id ?? '_none'}
                          onValueChange={v => patchDocSlot(d.id, { pasta_padrao_id: v === '_none' ? undefined : v })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Pasta padrão (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none" className="text-xs text-muted-foreground">Sem pasta padrão</SelectItem>
                            {pastas.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">{p.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar}>{tarefa ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog principal ─────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function NovaOcorrenciaDialog({ open, onOpenChange }: Props) {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()

  const { data: todosFluxos = [] } = useFluxosAtivos(tenantId)
  const { data: rotinas = [] }     = useRotinas(tenantId)
  const { data: clientes = [] }    = useClients(tenantId)
  const { data: users = [] }       = useUsers(tenantId)

  // Exclui fluxos vinculados a rotinas (processo automatizado)
  const fluxosRotina = new Set(rotinas.map((r) => r.fluxo_id).filter(Boolean))
  const fluxos = todosFluxos.filter((f) => !fluxosRotina.has(f.id))

  // ── Stepper ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0) // 0=Tipo, 1=Dados, 2=Tarefas

  // ── Seleção de tipo ───────────────────────────────────────────────────────
  const [fluxoId, setFluxoId] = useState<string | null>(null)

  // ── Dados ─────────────────────────────────────────────────────────────────
  const [clienteId, setClienteId]       = useState('')
  const [clienteIds, setClienteIds]     = useState<string[]>([])
  const [clienteBusca, setClienteBusca] = useState('')
  const [titulo, setTitulo]             = useState('')
  const [descricao, setDescricao]       = useState('')
  const [categoria, setCategoria]       = useState<CategoriaDemanda>('outros')
  const [valor, setValor]               = useState('')
  const [dataPrevista, setDataPrevista] = useState(format(addDays(new Date(), 15), 'yyyy-MM-dd'))
  const [responsavelId, setResponsavelId] = useState('')

  // ── Tarefas ───────────────────────────────────────────────────────────────
  const [tarefas, setTarefas]           = useState<TarefaEditavel[]>([])
  const [tarefaDialog, setTarefaDialog] = useState<TarefaEditavel | null | 'nova'>(null)

  const fluxoSelecionado = fluxos.find(f => f.id === fluxoId)
  const { data: fluxoTarefas = [] } = useFluxoTarefas(tenantId, fluxoId ?? '')

  const colaboradores  = users.filter(u => u.papel !== 'cliente' && u.ativo).map(u => ({ id: u.id, nome: u.nome }))
  const clientesAtivos = clientes.filter(c => c.status === 'ativo')

  const clientesFiltrados = useMemo(() =>
    clientesAtivos.filter(c =>
      !clienteBusca || c.razao_social.toLowerCase().includes(clienteBusca.toLowerCase())
    )
  , [clientesAtivos, clienteBusca])

  const todosClientesSelecionados =
    clientesFiltrados.length > 0 && clientesFiltrados.every(c => clienteIds.includes(c.id))

  // ── Reset ao fechar ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setStep(0)
      setFluxoId(null)
      setClienteId('')
      setClienteIds([])
      setClienteBusca('')
      setTitulo('')
      setDescricao('')
      setCategoria('outros')
      setValor('')
      setDataPrevista(format(addDays(new Date(), 15), 'yyyy-MM-dd'))
      setResponsavelId('')
      setTarefas([])
      setTarefaDialog(null)
    }
  }, [open])

  // Pré-preenche ao escolher fluxo
  useEffect(() => {
    if (fluxoSelecionado) {
      setTitulo(fluxoSelecionado.nome)
      setCategoria(fluxoSelecionado.categoria)
      if (fluxoSelecionado.valor_sugerido) setValor(String(fluxoSelecionado.valor_sugerido))
      setDataPrevista(format(addDays(new Date(), fluxoSelecionado.prazo_dias_padrao), 'yyyy-MM-dd'))
    }
  }, [fluxoSelecionado])

  // Carrega tarefas do fluxo
  useEffect(() => {
    if (fluxoTarefas.length > 0) {
      setTarefas(fluxoTarefas.map(t => ({
        _id: uuid(),
        nome: t.nome,
        descricao: t.descricao ?? '',
        prazo_relativo_dias: t.prazo_relativo_dias,
        responsavel_id: t.responsavel_padrao ?? '',
        checklist: (t.checklist ?? []).map(c => ({ id: c.id, nome: c.nome, origem: 'template' as const })),
        documentos_config: t.documentos_config ?? [],
      })))
    }
  }, [fluxoTarefas])

  const createOcorrencia      = useCreateOcorrencia()
  const createOcorrenciasLote = useCreateOcorrenciasLote()
  const isSaving = createOcorrencia.isPending || createOcorrenciasLote.isPending

  // ── Ações ─────────────────────────────────────────────────────────────────

  function selecionarFluxo(id: string | null) {
    setFluxoId(id)
    if (!id) {
      setTitulo('')
      setCategoria('outros')
      setValor('')
      setTarefas([{ _id: uuid(), nome: '', descricao: '', prazo_relativo_dias: 0, responsavel_id: '', checklist: [], documentos_config: [] }])
    }
    setStep(1)
  }

  function toggleCliente(id: string) {
    setClienteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleTodosClientes() {
    const idsFiltrados = clientesFiltrados.map(c => c.id)
    if (todosClientesSelecionados) {
      setClienteIds(prev => prev.filter(id => !idsFiltrados.includes(id)))
    } else {
      setClienteIds(prev => [...new Set([...prev, ...idsFiltrados])])
    }
  }

  function handleTarefaDialogSalvar(data: Partial<TarefaEditavel> & { nome: string; prazo_relativo_dias: number }) {
    if (tarefaDialog === 'nova') {
      setTarefas(prev => [...prev, {
        _id: uuid(),
        nome: data.nome,
        descricao: data.descricao ?? '',
        prazo_relativo_dias: data.prazo_relativo_dias,
        responsavel_id: data.responsavel_id ?? '',
        checklist: data.checklist ?? [],
        documentos_config: data.documentos_config ?? [],
      }])
    } else if (tarefaDialog && data._id) {
      setTarefas(prev => prev.map(t => t._id === data._id ? { ...t, ...data } : t))
    }
    setTarefaDialog(null)
  }

  function removeTarefa(id: string) {
    setTarefas(prev => prev.filter(t => t._id !== id))
  }

  function calcularDataTarefa(prazoRelativo: number): string {
    return format(addDays(new Date(dataPrevista + 'T00:00:00'), prazoRelativo), 'yyyy-MM-dd')
  }

  function buildTarefasPayload() {
    return tarefas.map((t, i) => ({
      tenant_id: tenantId,
      ordem: i + 1,
      nome: t.nome.trim(),
      descricao: t.descricao.trim() || undefined,
      data_prevista: calcularDataTarefa(t.prazo_relativo_dias),
      status: 'pendente' as const,
      responsavel_id: t.responsavel_id || responsavelId || undefined,
      checklist_progresso: t.checklist.filter(c => c.nome.trim()).map((c, j) => ({
        id: c.id,
        item_id: c.id,
        nome: c.nome,
        ordem: j + 1,
        concluido: false,
        origem: c.origem,
      })),
      documentos_config: t.documentos_config.length > 0 ? t.documentos_config : undefined,
    }))
  }

  async function handleSalvar() {
    if (!titulo.trim())
      return toast({ title: 'Informe o título', variant: 'destructive' })
    if (tarefas.length === 0)
      return toast({ title: 'Adicione ao menos uma tarefa', variant: 'destructive' })
    if (tarefas.some(t => !t.nome.trim()))
      return toast({ title: 'Há tarefas sem nome', variant: 'destructive' })

    const hoje = format(new Date(), 'yyyy-MM-dd')

    if (fluxoId) {
      if (clienteIds.length === 0)
        return toast({ title: 'Selecione ao menos um cliente', variant: 'destructive' })

      const ocorrenciaBase = {
        tenant_id: tenantId,
        titulo: titulo.trim(),
        origem: 'fluxo' as const,
        fluxo_id: fluxoId,
        categoria,
        valor: valor ? parseFloat(valor) : undefined,
        data_solicitacao: hoje,
        data_prevista: dataPrevista,
        status: 'pendente' as const,
        responsavel_id: responsavelId || undefined,
        criado_por: currentUser?.id ?? '',
        criado_em: new Date().toISOString(),
      }

      if (clienteIds.length === 1) {
        createOcorrencia.mutate(
          { ocorrencia: { ...ocorrenciaBase, cliente_id: clienteIds[0] }, tarefas: buildTarefasPayload() },
          {
            onSuccess: () => { toast({ title: 'Ocorrência criada com sucesso' }); onOpenChange(false) },
            onError: () => toast({ title: 'Erro ao criar ocorrência', variant: 'destructive' }),
          }
        )
      } else {
        createOcorrenciasLote.mutate(
          { loteId: uuid(), clienteIds, ocorrenciaBase, tarefas: buildTarefasPayload() },
          {
            onSuccess: (criadas) => { toast({ title: `${criadas.length} ocorrências criadas em lote` }); onOpenChange(false) },
            onError: () => toast({ title: 'Erro ao criar lote', variant: 'destructive' }),
          }
        )
      }
      return
    }

    if (!clienteId)
      return toast({ title: 'Selecione o cliente', variant: 'destructive' })

    createOcorrencia.mutate(
      {
        ocorrencia: {
          tenant_id: tenantId,
          titulo: titulo.trim(),
          cliente_id: clienteId,
          origem: 'manual',
          categoria,
          valor: valor ? parseFloat(valor) : undefined,
          data_solicitacao: hoje,
          data_prevista: dataPrevista,
          status: 'pendente',
          responsavel_id: responsavelId || undefined,
          criado_por: currentUser?.id ?? '',
          criado_em: new Date().toISOString(),
        },
        tarefas: buildTarefasPayload(),
      },
      {
        onSuccess: () => { toast({ title: 'Ocorrência criada com sucesso' }); onOpenChange(false) },
        onError: () => toast({ title: 'Erro ao criar ocorrência', variant: 'destructive' }),
      }
    )
  }

  // Contagem para badge do stepper
  const clientesSelecionadosCount = fluxoId ? clienteIds.length : (clienteId ? 1 : 0)

  const tarefaEmEdicao = tarefaDialog !== 'nova' ? tarefaDialog : null
  const tarefaDialogOrdem = tarefaDialog === 'nova'
    ? tarefas.length + 1
    : tarefas.findIndex(t => t._id === (tarefaDialog as TarefaEditavel)?._id) + 1

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">

          {/* Cabeçalho com stepper */}
          <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b">
            <DialogTitle className="text-base">Nova Ocorrência</DialogTitle>

            <div className="flex items-center mt-3">
              {(['Tipo', 'Dados', 'Tarefas'] as const).map((label, i) => (
                <div key={i} className={`flex items-center ${i < 2 ? 'flex-1' : ''}`}>
                  <button
                    type="button"
                    onClick={() => i < step && setStep(i)}
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
                    {i === 1 && clientesSelecionadosCount > 0 && (
                      <span className="hidden sm:inline bg-muted text-muted-foreground text-[10px] font-semibold rounded px-1 py-0.5 leading-none">
                        {clientesSelecionadosCount}
                      </span>
                    )}
                    {i === 2 && tarefas.length > 0 && (
                      <span className="hidden sm:inline bg-muted text-muted-foreground text-[10px] font-semibold rounded px-1 py-0.5 leading-none">
                        {tarefas.length}
                      </span>
                    )}
                  </button>
                  {i < 2 && (
                    <div className={['flex-1 h-px mx-3 transition-colors', i < step ? 'bg-primary/30' : 'bg-muted-foreground/15'].join(' ')} />
                  )}
                </div>
              ))}
            </div>
          </DialogHeader>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto">

            {/* Passo 1 — Tipo */}
            {step === 0 && (
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecione um fluxo para pré-preencher as tarefas, ou crie do zero.
                </p>

                {fluxos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {fluxos.map(f => {
                      const cfg = categoriaConfig[f.categoria]
                      const Icon = cfg.icon
                      return (
                        <button
                          key={f.id}
                          onClick={() => selecionarFluxo(f.id)}
                          className={`relative overflow-hidden border rounded-xl bg-linear-to-br ${cfg.gradient} text-left hover:shadow-md transition-all`}
                        >
                          {/* barra lateral */}
                          <div className={`absolute left-0 top-0 bottom-0 w-0.75 ${cfg.bar}`} />

                          <div className="pl-4 pr-3 py-3.5 flex flex-col gap-2">
                            {/* ícone */}
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                              <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                            </div>

                            {/* nome */}
                            <p className="font-semibold text-sm leading-snug line-clamp-2">{f.nome}</p>

                            {/* meta */}
                            <span className="text-[11px] text-muted-foreground">
                              {cfg.label} · {f.prazo_dias_padrao} dias
                            </span>

                            {f.valor_sugerido && (
                              <span className="text-[11px] text-muted-foreground">
                                Sugerido: {f.valor_sugerido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {fluxos.length > 0 && <Separator />}

                <button
                  onClick={() => selecionarFluxo(null)}
                  className="w-full flex items-center gap-3 p-4 border border-dashed rounded-lg hover:bg-accent text-left transition-colors"
                >
                  <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Criar do zero</p>
                    <p className="text-xs text-muted-foreground">Defina título, tarefas e prazo manualmente</p>
                  </div>
                </button>
              </div>
            )}

            {/* Passo 2 — Dados */}
            {step === 1 && (
              <div className="px-6 py-5 space-y-4">

                {fluxoSelecionado && (
                  <Badge variant="outline" className="text-xs">
                    {categoriaConfig[fluxoSelecionado.categoria].label} · {fluxoSelecionado.nome}
                  </Badge>
                )}

                {/* Clientes */}
                {fluxoId ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Clientes *</Label>
                      <span className="text-xs text-muted-foreground">
                        {clienteIds.length === 0 ? 'Nenhum selecionado' : `${clienteIds.length} selecionado${clienteIds.length > 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Buscar cliente..."
                      value={clienteBusca}
                      onChange={e => setClienteBusca(e.target.value)}
                    />
                    <div className="border rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={toggleTodosClientes}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-accent/40 border-b transition-colors"
                      >
                        {todosClientesSelecionados
                          ? <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                          : <Square className="h-3.5 w-3.5 shrink-0" />}
                        Selecionar todos ({clientesFiltrados.length})
                      </button>
                      <div className="max-h-40 overflow-y-auto divide-y">
                        {clientesFiltrados.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">Nenhum cliente encontrado</p>
                        ) : clientesFiltrados.map(c => (
                          <label key={c.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent/30 cursor-pointer transition-colors">
                            <Checkbox
                              checked={clienteIds.includes(c.id)}
                              onCheckedChange={() => toggleCliente(c.id)}
                              className="h-4 w-4"
                            />
                            <span className="text-sm truncate">{c.razao_social}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {clienteIds.length > 1 && (
                      <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                          <Layers className="h-3.5 w-3.5" />
                          Criação em lote: {clienteIds.length} ocorrências
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {clienteIds.map(id => clientes.find(c => c.id === id)?.razao_social ?? id).join(' · ')}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Cliente *</Label>
                    <Select value={clienteId} onValueChange={setClienteId}>
                      <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                      <SelectContent>
                        {clientesAtivos.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Título *</Label>
                  <Input
                    autoFocus
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    placeholder="Ex: Alteração de Contrato Social"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    placeholder="Detalhes do pedido do cliente..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Categoria</Label>
                    <Select value={categoria} onValueChange={v => setCategoria(v as CategoriaDemanda)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoriaConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor (opcional)</Label>
                    <Input
                      type="number"
                      value={valor}
                      onChange={e => setValor(e.target.value)}
                      placeholder="Incluso no contrato"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Data prevista *</Label>
                    <Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Responsável padrão</Label>
                    <Select value={responsavelId} onValueChange={setResponsavelId}>
                      <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem responsável</SelectItem>
                        {colaboradores.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Passo 3 — Tarefas */}
            {step === 2 && (
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {tarefas.length === 0
                      ? 'Nenhuma tarefa ainda.'
                      : `${tarefas.length} tarefa${tarefas.length !== 1 ? 's' : ''}`}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setTarefaDialog('nova')}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Nova Tarefa
                  </Button>
                </div>

                {tarefas.length === 0 ? (
                  <button
                    onClick={() => setTarefaDialog('nova')}
                    className="w-full py-8 border-2 border-dashed rounded-lg text-sm text-muted-foreground hover:bg-accent/30 transition-colors"
                  >
                    Clique em "Nova Tarefa" para adicionar tarefas à ocorrência.
                    <br /><span className="text-xs opacity-70">Ao menos uma tarefa é necessária.</span>
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    {tarefas.map((t, i) => {
                      const respNome = colaboradores.find(u => u.id === t.responsavel_id)?.nome
                      return (
                        <div
                          key={t._id}
                          className="flex items-center gap-2 border rounded-lg px-3 py-2.5 hover:bg-muted/30 cursor-pointer select-none"
                          onClick={() => setTarefaDialog(t)}
                        >
                          <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums text-right">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {t.nome || <span className="text-muted-foreground italic font-normal">sem nome</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.prazo_relativo_dias === 0
                                ? 'No vencimento'
                                : t.prazo_relativo_dias < 0
                                  ? `${Math.abs(t.prazo_relativo_dias)}d antes`
                                  : `${t.prazo_relativo_dias}d depois`}
                              {respNome && ` · ${respNome}`}
                              {t.checklist.filter(c => c.nome.trim()).length > 0 && ` · ${t.checklist.filter(c => c.nome.trim()).length} ${t.checklist.filter(c => c.nome.trim()).length === 1 ? 'item' : 'itens'}`}
                            </p>
                          </div>
                          <div className="flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setTarefaDialog(t)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              disabled={tarefas.length === 1}
                              onClick={() => removeTarefa(t._id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Tempo (dias) é relativo ao prazo final (negativo = antes, 0 = no vencimento, positivo = depois).
                </p>
              </div>
            )}
          </div>

          {/* Footer de navegação */}
          <div className="px-6 py-4 border-t shrink-0 flex items-center gap-2">
            <Button variant="ghost" className="mr-auto text-muted-foreground" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                ← Voltar
              </Button>
            )}
            {step === 0 ? null : step < 2 ? (
              <Button
                onClick={() => { if (titulo.trim()) setStep(s => s + 1) }}
                disabled={!titulo.trim()}
              >
                Próximo →
              </Button>
            ) : (
              <Button onClick={handleSalvar} disabled={isSaving}>
                {isSaving ? 'Salvando...' : (
                  fluxoId && clienteIds.length > 1
                    ? `Criar ${clienteIds.length} Ocorrências`
                    : 'Criar Ocorrência'
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {tarefaDialog !== null && (
        <TarefaEditavelDialog
          tarefa={tarefaEmEdicao}
          ordem={tarefaDialogOrdem}
          colaboradores={colaboradores}
          tenantId={tenantId}
          clienteId={fluxoId ? undefined : clienteId}
          onClose={() => setTarefaDialog(null)}
          onSalvar={handleTarefaDialogSalvar}
        />
      )}
    </>
  )
}
