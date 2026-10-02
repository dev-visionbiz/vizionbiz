import { useState, useEffect, useMemo } from 'react'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import {
  CheckCircle2, Circle, AlertTriangle, X, Plus, Trash2,
  Pencil, DollarSign, List, PlayCircle, Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useUsers } from '@/data/hooks/useUsers'
import { useInvoices, useCreateInvoice } from '@/data/hooks/useInvoices'
import {
  useTarefasOcorrencia,
  useUpdateOcorrencia,
  useUpdateTarefaNova,
  useCreateTarefa,
  useDeleteTarefa,
  useUpdateChecklistTarefa,
  useConcluirTarefa,
} from '@/data/hooks/useOcorrencias'
import { useRegistrarHistoricoTarefa } from '@/data/hooks/useHistoricoTarefa'
import { ChecklistProgresso } from '@/components/shared/ChecklistProgresso'
import { HistoricoPanel } from '@/components/shared/HistoricoPanel'
import { TarefaDocumentosPanel } from './TarefaDocumentosPanel'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { formatDate, cn } from '@/lib/utils'
import type {
  Ocorrencia, Tarefa, TarefaStatus, OcorrenciaStatus,
  ChecklistItemProgresso, ChecklistItemTemplate, CategoriaDemanda,
} from '@/domain/types'

// ─── Config de status ────────────────────────────────────────────────────────

const tarefaStatusConfig: Record<TarefaStatus, { label: string; className: string }> = {
  pendente:      { label: 'Pendente',     className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento:  { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  concluida:     { label: 'Concluída',    className: 'bg-green-100 text-green-800 border-transparent' },
  atrasada:      { label: 'Atrasada',     className: 'bg-red-100 text-red-800 border-transparent' },
  nao_se_aplica: { label: 'N/A',          className: 'bg-gray-100 text-gray-500 border-transparent' },
  impedido:      { label: 'Impedida',     className: 'bg-orange-100 text-orange-800 border-transparent' },
}

const ocorrenciaStatusConfig: Record<OcorrenciaStatus, { label: string; className: string }> = {
  pendente:     { label: 'Pendente',     className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento: { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  concluida:    { label: 'Concluída',    className: 'bg-green-100 text-green-800 border-transparent' },
  cancelada:    { label: 'Cancelada',    className: 'bg-gray-100 text-gray-500 border-transparent' },
}

// ─── Editor de tarefa (painel de detalhe) ────────────────────────────────────

interface TarefaDetalheConteudoProps {
  tarefa: Tarefa
  ocorrenciaTitulo: string
  ocorrenciaId: string
  clienteId?: string
  clienteNome?: string
  colaboradores: { id: string; nome: string }[]
  onClose: () => void
  onSalvar: (id: string, data: Partial<Tarefa>) => void
  onConcluir: (tarefaId: string) => void
  isSaving: boolean
}

function TarefaDetalheConteudo({
  tarefa, ocorrenciaTitulo, ocorrenciaId, clienteId, clienteNome, colaboradores, onClose, onSalvar, onConcluir, isSaving,
}: TarefaDetalheConteudoProps) {
  const { toast } = useToast()
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const updateChecklist = useUpdateChecklistTarefa()
  const registrar       = useRegistrarHistoricoTarefa()

  const [editStatus,  setEditStatus]  = useState<TarefaStatus>(tarefa.status)
  const [editResp,    setEditResp]    = useState(tarefa.responsavel_id ?? '')
  const [editObs,     setEditObs]     = useState(tarefa.observacoes ?? '')
  const [editImpDesc, setEditImpDesc] = useState(tarefa.impedimento_descricao ?? '')
  const [editImpResp, setEditImpResp] = useState(tarefa.impedimento_responsavel ?? '')
  const [checklist,   setChecklist]   = useState<ChecklistItemProgresso[]>(() =>
    tarefa.checklist_progresso ?? []
  )

  useEffect(() => {
    setEditStatus(tarefa.status)
    setEditResp(tarefa.responsavel_id ?? '')
    setEditObs(tarefa.observacoes ?? '')
    setEditImpDesc(tarefa.impedimento_descricao ?? '')
    setEditImpResp(tarefa.impedimento_responsavel ?? '')
    setChecklist(tarefa.checklist_progresso ?? [])
  }, [tarefa.id])

  const hasChanges =
    editStatus !== tarefa.status ||
    editResp !== (tarefa.responsavel_id ?? '') ||
    editObs !== (tarefa.observacoes ?? '') ||
    editImpDesc !== (tarefa.impedimento_descricao ?? '') ||
    editImpResp !== (tarefa.impedimento_responsavel ?? '')

  function saveChecklist(updated: ChecklistItemProgresso[]) {
    updateChecklist.mutate({ id: tarefa.id, checklist_progresso: updated })
  }

  function handleChecklistToggle(itemId: string) {
    const item = checklist.find(i => i.id === itemId)
    const updated = checklist.map(i =>
      i.id === itemId ? { ...i, concluido: !i.concluido, concluido_em: !i.concluido ? format(new Date(), 'yyyy-MM-dd') : undefined } : i
    )
    setChecklist(updated)
    saveChecklist(updated)
    if (item && !item.concluido && item.inicio_em) {
      registrar.mutate({ tenantId, tarefaId: tarefa.id, tarefaTipo: 'tarefa', tipo: 'conclusao_item_checklist', autorId: currentUser?.id, autorNome: currentUser?.nome, meta: { checklist_item_nome: item.nome } })
    }
    if (updated.length > 0 && updated.every(i => i.concluido)) {
      registrar.mutate({ tenantId, tarefaId: tarefa.id, tarefaTipo: 'tarefa', tipo: 'checklist_completo', autorId: currentUser?.id, autorNome: currentUser?.nome })
    }
  }

  function handleChecklistIniciar(itemId: string, opcoes: { observacao?: string; tempo_estimado_min?: number; usar_timer?: boolean }) {
    const item = checklist.find(i => i.id === itemId)
    if (!item) return
    const updated = checklist.map(i =>
      i.id === itemId ? { ...i, inicio_em: new Date().toISOString(), tempo_estimado_min: opcoes.tempo_estimado_min, usar_timer: opcoes.usar_timer } : i
    )
    setChecklist(updated)
    saveChecklist(updated)
    registrar.mutate({ tenantId, tarefaId: tarefa.id, tarefaTipo: 'tarefa', tipo: 'inicio_item_checklist', autorId: currentUser?.id, autorNome: currentUser?.nome, conteudo: opcoes.observacao, meta: { checklist_item_nome: item.nome } })
  }

  function handleChecklistPausar(itemId: string) {
    const item = checklist.find(i => i.id === itemId)
    if (!item?.inicio_em) return
    const agora = new Date().toISOString()
    const decorridoMs = new Date(agora).getTime() - new Date(item.inicio_em).getTime() - (item.tempo_pausado_acumulado_ms ?? 0)
    const updated = checklist.map(i => i.id === itemId ? { ...i, timer_pausado_em: agora } : i)
    setChecklist(updated)
    saveChecklist(updated)
    registrar.mutate({ tenantId, tarefaId: tarefa.id, tarefaTipo: 'tarefa', tipo: 'pausa_item_checklist', autorId: currentUser?.id, autorNome: currentUser?.nome, meta: { checklist_item_nome: item.nome, tempo_decorrido_min: Math.round(decorridoMs / 60_000) } })
  }

  function handleChecklistRetomar(itemId: string) {
    const item = checklist.find(i => i.id === itemId)
    if (!item?.timer_pausado_em) return
    const pausadoMs = Date.now() - new Date(item.timer_pausado_em).getTime()
    const updated = checklist.map(i =>
      i.id === itemId ? { ...i, timer_pausado_em: undefined, tempo_pausado_acumulado_ms: (i.tempo_pausado_acumulado_ms ?? 0) + pausadoMs } : i
    )
    setChecklist(updated)
    saveChecklist(updated)
    registrar.mutate({ tenantId, tarefaId: tarefa.id, tarefaTipo: 'tarefa', tipo: 'retomada_item_checklist', autorId: currentUser?.id, autorNome: currentUser?.nome, meta: { checklist_item_nome: item.nome } })
  }

  function handleChecklistParar(itemId: string, observacao?: string) {
    const item = checklist.find(i => i.id === itemId)
    if (!item) return
    const decorridoMs = item.inicio_em
      ? (item.timer_pausado_em ? new Date(item.timer_pausado_em).getTime() : Date.now()) - new Date(item.inicio_em).getTime() - (item.tempo_pausado_acumulado_ms ?? 0)
      : 0
    const updated = checklist.map(i =>
      i.id === itemId ? { ...i, inicio_em: undefined, timer_pausado_em: undefined, tempo_pausado_acumulado_ms: undefined, tempo_estimado_min: undefined, usar_timer: undefined } : i
    )
    setChecklist(updated)
    saveChecklist(updated)
    registrar.mutate({ tenantId, tarefaId: tarefa.id, tarefaTipo: 'tarefa', tipo: 'cancelamento_item_checklist', autorId: currentUser?.id, autorNome: currentUser?.nome, conteudo: observacao, meta: { checklist_item_nome: item.nome, tempo_decorrido_min: Math.round(decorridoMs / 60_000) } })
  }

  function handleChecklistAdicionar(nome: string) {
    const novoItem: ChecklistItemProgresso = { id: uuid(), nome, ordem: checklist.length + 1, concluido: false, origem: 'custom' }
    const updated = [...checklist, novoItem]
    setChecklist(updated)
    saveChecklist(updated)
  }

  function handleChecklistRemover(itemId: string) {
    const updated = checklist.filter(i => i.id !== itemId).map((i, n) => ({ ...i, ordem: n + 1 }))
    setChecklist(updated)
    saveChecklist(updated)
  }

  function handleSalvar() {
    if (editStatus === 'concluida' && tarefa.status !== 'concluida') {
      onConcluir(tarefa.id)
      registrar.mutate({ tenantId, tarefaId: tarefa.id, tarefaTipo: 'tarefa', tipo: 'status_alterado', autorId: currentUser?.id, autorNome: currentUser?.nome, meta: { status_anterior: tarefa.status, status_novo: 'concluida' } })
      return
    }
    if (editStatus === 'impedido') {
      if (!editImpDesc.trim()) return toast({ title: 'Informe a descrição do impedimento', variant: 'destructive' })
      if (!editImpResp) return toast({ title: 'Atribua um responsável pela resolução', variant: 'destructive' })
    }
    const hoje = format(new Date(), 'yyyy-MM-dd')
    onSalvar(tarefa.id, {
      status: editStatus,
      responsavel_id: editResp || undefined,
      observacoes: editObs || undefined,
      ...(editStatus === 'impedido'
        ? { impedimento_descricao: editImpDesc, impedimento_responsavel: editImpResp, impedimento_data: tarefa.impedimento_data ?? hoje }
        : { impedimento_descricao: undefined, impedimento_responsavel: undefined }),
    })
    const base = { tenantId, tarefaId: tarefa.id, tarefaTipo: 'tarefa' as const, autorId: currentUser?.id, autorNome: currentUser?.nome }
    if (editStatus !== tarefa.status) registrar.mutate({ ...base, tipo: 'status_alterado', meta: { status_anterior: tarefa.status, status_novo: editStatus } })
    if (editResp !== (tarefa.responsavel_id ?? '')) registrar.mutate({ ...base, tipo: 'responsavel_alterado', meta: { responsavel_anterior_nome: tarefa.responsavel_id ? (colaboradores.find(u => u.id === tarefa.responsavel_id)?.nome ?? tarefa.responsavel_id) : 'Nenhum', responsavel_novo_nome: editResp ? (colaboradores.find(u => u.id === editResp)?.nome ?? editResp) : 'Nenhum' } })
    if (tarefa.status !== 'impedido' && editStatus === 'impedido') registrar.mutate({ ...base, tipo: 'impedimento_registrado' })
    else if (tarefa.status === 'impedido' && editStatus !== 'impedido') registrar.mutate({ ...base, tipo: 'impedimento_resolvido' })
  }

  const isConcluida = tarefa.status === 'concluida'
  const isImpedida  = tarefa.status === 'impedido'
  const stConfig    = tarefaStatusConfig[editStatus]

  const salvarLabel = editStatus === 'concluida' && !isConcluida
    ? 'Marcar como concluída'
    : tarefa.status === 'concluida' && editStatus !== 'concluida'
      ? 'Reabrir tarefa'
      : 'Salvar'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-2 px-3 pt-3 pb-2.5 shrink-0 border-b bg-primary/[0.04]">
        <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 shrink-0 mt-0.5">
          Tarefa
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{tarefa.nome}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{ocorrenciaTitulo}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body scrollável */}
      <div className="overflow-y-auto flex-1 px-3 py-3 space-y-3">
        {tarefa.descricao && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 italic">{tarefa.descricao}</p>
        )}

        {/* Status + Responsável */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select
              value={editStatus}
              onValueChange={v => setEditStatus(v as TarefaStatus)}
              disabled={isConcluida}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['pendente', 'em_andamento', 'concluida', 'nao_se_aplica', 'impedido'] as TarefaStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{tarefaStatusConfig[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              {isImpedida ? 'Quem deve resolver' : 'Responsável'}
            </Label>
            <Select value={editResp || '_none'} onValueChange={v => setEditResp(v === '_none' ? '' : v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sem responsável</SelectItem>
                {colaboradores.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Impedimento */}
        {editStatus === 'impedido' && (
          <div className="space-y-2 border border-orange-200 bg-orange-50/50 rounded-lg p-3">
            <p className="text-xs font-medium text-orange-700">Impedimento</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição *</Label>
              <Textarea
                value={editImpDesc}
                onChange={e => setEditImpDesc(e.target.value)}
                placeholder="O que está impedindo a execução?"
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Responsável pela resolução *</Label>
              <Select value={editImpResp || '_none'} onValueChange={v => setEditImpResp(v === '_none' ? '' : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Selecionar</SelectItem>
                  {colaboradores.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Observações */}
        <div className="space-y-1.5">
          <Label className="text-xs">Observações</Label>
          <Textarea
            value={editObs}
            onChange={e => setEditObs(e.target.value)}
            placeholder="Anotações sobre esta tarefa..."
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Checklist */}
        <ChecklistProgresso
          itens={checklist}
          readonly={isConcluida}
          onToggle={handleChecklistToggle}
          onIniciar={handleChecklistIniciar}
          onPausar={handleChecklistPausar}
          onRetomar={handleChecklistRetomar}
          onParar={handleChecklistParar}
          onAdicionar={handleChecklistAdicionar}
          onRemover={handleChecklistRemover}
          tarefaId={tarefa.id}
          tenantId={tenantId}
          autorId={currentUser?.id}
          autorNome={currentUser?.nome}
          tarefaTitulo={ocorrenciaTitulo}
          clienteNome={clienteNome}
        />

        {/* Documentos */}
        {clienteId && (
          <TarefaDocumentosPanel
            tenantId={tenantId}
            tarefaId={tarefa.id}
            ocorrenciaId={ocorrenciaId}
            clienteId={clienteId}
            documentosConfig={tarefa.documentos_config}
            readonly={isConcluida}
          />
        )}

        {/* Histórico */}
        <HistoricoPanel tenantId={tenantId} tarefaId={tarefa.id} tarefaTipo="tarefa" />
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-3 border-t flex justify-between items-center gap-2 bg-background">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${stConfig.className}`}>{stConfig.label}</Badge>
          <span className="text-xs text-muted-foreground">{formatDate(tarefa.data_prevista)}</span>
        </div>
        <Button
          size="sm"
          onClick={handleSalvar}
          disabled={isSaving || (!hasChanges && editStatus === tarefa.status)}
          variant={editStatus === 'concluida' && !isConcluida ? 'default' : 'outline'}
        >
          {isSaving ? 'Salvando...' : salvarLabel}
        </Button>
      </div>
    </div>
  )
}

// ─── Dialog mobile ────────────────────────────────────────────────────────────

function TarefaDetalheDialog({
  tarefa, ocorrenciaTitulo, ocorrenciaId, clienteId, clienteNome, colaboradores, onClose, onSalvar, onConcluir, isSaving,
}: TarefaDetalheConteudoProps) {
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="p-0 gap-0 max-h-[92vh] flex flex-col [&>button:last-child]:hidden">
        <TarefaDetalheConteudo
          tarefa={tarefa}
          ocorrenciaTitulo={ocorrenciaTitulo}
          ocorrenciaId={ocorrenciaId}
          clienteId={clienteId}
          clienteNome={clienteNome}
          colaboradores={colaboradores}
          onClose={onClose}
          onSalvar={onSalvar}
          onConcluir={onConcluir}
          isSaving={isSaving}
        />
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog de nova tarefa ────────────────────────────────────────────────────

interface NovaTarefaDialogProps {
  ocorrencia: Ocorrencia
  totalTarefas: number
  colaboradores: { id: string; nome: string }[]
  tenantId: string
  onClose: () => void
  onCreate: (data: { nome: string; data_prevista: string; descricao?: string; responsavel_id?: string; ordem: number }) => void
  isSaving: boolean
}

function NovaTarefaDialog({ ocorrencia, totalTarefas, colaboradores, tenantId: _tenantId, onClose, onCreate, isSaving }: NovaTarefaDialogProps) {
  const { toast } = useToast()
  const [nome, setNome]           = useState('')
  const [dataPrevista, setData]   = useState(ocorrencia.data_prevista)
  const [respId, setRespId]       = useState('')
  const [descricao, setDescricao] = useState('')

  function handleSalvar() {
    if (!nome.trim()) return toast({ title: 'Informe o nome da tarefa', variant: 'destructive' })
    onCreate({ nome: nome.trim(), data_prevista: dataPrevista, descricao: descricao.trim() || undefined, responsavel_id: respId || undefined, ordem: totalTarefas + 1 })
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Reunião com cliente" autoFocus onKeyDown={e => e.key === 'Enter' && handleSalvar()} />
          </div>
          <div className="space-y-1.5">
            <Label>Data prevista</Label>
            <Input type="date" value={dataPrevista} onChange={e => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={respId} onValueChange={setRespId}>
              <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem responsável</SelectItem>
                {colaboradores.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Instruções / informativo</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Orientações para executar esta tarefa..." rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={isSaving}>
            {isSaving ? 'Adicionando...' : 'Adicionar tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Formulário de edição da ocorrência ──────────────────────────────────────

interface EditOcorrenciaFormProps {
  ocorrencia: Ocorrencia
  colaboradores: { id: string; nome: string }[]
  onSalvar: (data: Partial<Ocorrencia>) => void
  onCancelar: () => void
  isSaving: boolean
}

function EditOcorrenciaForm({ ocorrencia, colaboradores, onSalvar, onCancelar, isSaving }: EditOcorrenciaFormProps) {
  const [titulo, setTitulo]             = useState(ocorrencia.titulo)
  const [descricao, setDescricao]       = useState('')
  const [valor, setValor]               = useState(ocorrencia.valor ? String(ocorrencia.valor) : '')
  const [dataPrevista, setDataPrevista] = useState(ocorrencia.data_prevista)
  const [responsavelId, setResp]        = useState(ocorrencia.responsavel_id ?? '')
  const { toast } = useToast()

  function handleSalvar() {
    if (!titulo.trim()) return toast({ title: 'Informe o título', variant: 'destructive' })
    onSalvar({
      titulo: titulo.trim(),
      valor: valor ? parseFloat(valor) : undefined,
      data_prevista: dataPrevista,
      responsavel_id: responsavelId || undefined,
    })
  }

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Editar ocorrência</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Título *</Label>
          <Input value={titulo} onChange={e => setTitulo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor (opcional)</Label>
          <Input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="Incluso no contrato" step="0.01" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data prevista</Label>
          <Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Responsável</Label>
          <Select value={responsavelId || '_none'} onValueChange={v => setResp(v === '_none' ? '' : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sem responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sem responsável</SelectItem>
              {colaboradores.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancelar}>Cancelar</Button>
        <Button size="sm" onClick={handleSalvar} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  )
}

// ─── Conteúdo do detalhe da ocorrência (sem Dialog) ──────────────────────────

export interface OcorrenciaDetalheConteudoProps {
  ocorrencia: Ocorrencia
  onClose: () => void
  onTarefaAbrir?: (tarefa: Tarefa) => void
  tarefaSelecionadaId?: string
}

export function OcorrenciaDetalheConteudo({ ocorrencia, onClose, onTarefaAbrir, tarefaSelecionadaId }: OcorrenciaDetalheConteudoProps) {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()

  const { data: tarefas = [] }   = useTarefasOcorrencia(tenantId, ocorrencia.id)
  const { data: clientes = [] }  = useClients(tenantId)
  const { data: users = [] }     = useUsers(tenantId)
  const { data: invoices = [] }  = useInvoices(tenantId)

  const updateOcorrencia     = useUpdateOcorrencia()
  const updateTarefa         = useUpdateTarefaNova()
  const concluirTarefa       = useConcluirTarefa()
  const createTarefa         = useCreateTarefa()
  const deleteTarefa         = useDeleteTarefa()
  const createInvoice        = useCreateInvoice()
  const registrarHistorico   = useRegistrarHistoricoTarefa()

  const [tarefaDetalhe, setTarefaDetalhe]       = useState<Tarefa | null>(null)
  const [novaTarefaOpen, setNovaTarefaOpen]     = useState(false)
  const [editandoOcorrencia, setEditandoOcorrencia] = useState(false)

  const cliente       = clientes.find(c => c.id === ocorrencia.cliente_id)
  const colaboradores = users.filter(u => u.papel !== 'cliente' && u.ativo).map(u => ({ id: u.id, nome: u.nome }))

  const invoiceDaOcorrencia = ocorrencia.invoice_id
    ? invoices.find(inv => inv.id === ocorrencia.invoice_id)
    : null

  const temValor        = (ocorrencia.valor ?? 0) > 0
  const podeGerarFatura = temValor && !ocorrencia.invoice_id
  const concluidas      = tarefas.filter(t => t.status === 'concluida').length
  const progresso       = tarefas.length > 0 ? Math.round((concluidas / tarefas.length) * 100) : 0

  function handleTarefaClick(t: Tarefa) {
    if (ocorrencia.status === 'cancelada') return
    if (onTarefaAbrir) {
      onTarefaAbrir(t)
    } else {
      setTarefaDetalhe(t)
    }
  }

  function handleSalvarTarefa(id: string, data: Partial<Tarefa>) {
    updateTarefa.mutate({ id, data }, {
      onSuccess: () => {
        toast({ title: 'Tarefa atualizada' })
        setTarefaDetalhe(null)
      },
    })
  }

  function handleConcluirTarefa(tarefaId: string) {
    concluirTarefa.mutate({ tarefaId, ocorrenciaId: ocorrencia.id }, {
      onSuccess: () => {
        toast({ title: 'Tarefa concluída' })
        setTarefaDetalhe(null)
      },
    })
  }

  function handleSalvarOcorrencia(data: Partial<Ocorrencia>) {
    updateOcorrencia.mutate({ id: ocorrencia.id, data }, {
      onSuccess: () => {
        toast({ title: 'Ocorrência atualizada' })
        setEditandoOcorrencia(false)
      },
    })
  }

  function handleCriarTarefa(data: { nome: string; data_prevista: string; descricao?: string; responsavel_id?: string; ordem: number }) {
    createTarefa.mutate(
      { tenant_id: tenantId, ocorrencia_id: ocorrencia.id, status: 'pendente', ...data },
      {
        onSuccess: novaTarefa => {
          toast({ title: 'Tarefa adicionada' })
          setNovaTarefaOpen(false)
          registrarHistorico.mutate({
            tenantId,
            tarefaId: novaTarefa.id,
            tarefaTipo: 'tarefa',
            tipo: 'criacao',
            autorId: currentUser?.id,
            autorNome: currentUser?.nome,
          })
        },
      }
    )
  }

  function handleDeletarTarefa(tarefaId: string) {
    deleteTarefa.mutate(tarefaId, {
      onSuccess: () => toast({ title: 'Tarefa removida' }),
    })
  }

  function cancelarOcorrencia() {
    updateOcorrencia.mutate(
      { id: ocorrencia.id, data: { status: 'cancelada' } },
      { onSuccess: () => toast({ title: 'Ocorrência cancelada' }) }
    )
  }

  function gerarFatura() {
    const vencimento = format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    const invoiceId  = uuid()
    createInvoice.mutate(
      {
        id: invoiceId,
        tenant_id: tenantId,
        client_id: ocorrencia.cliente_id!,
        competencia: format(new Date(), 'yyyy-MM'),
        vencimento,
        valor_original: ocorrencia.valor!,
        status: 'aberta',
        origem: 'avulsa',
      },
      {
        onSuccess: () => {
          updateOcorrencia.mutate({ id: ocorrencia.id, data: { invoice_id: invoiceId } })
          toast({ title: 'Fatura criada', description: `R$ ${ocorrencia.valor?.toFixed(2)}` })
        },
      }
    )
  }

  const dstConfig  = ocorrenciaStatusConfig[ocorrencia.status]
  const podeEditar = ocorrencia.status !== 'cancelada' && ocorrencia.status !== 'concluida'

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 px-4 py-3 border-b shrink-0">
          <div className="min-w-0 flex items-start gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{ocorrencia.titulo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{cliente?.razao_social ?? '—'}</p>
            </div>
            {podeEditar && !editandoOcorrencia && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0 mt-0.5" onClick={() => setEditandoOcorrencia(true)} title="Editar ocorrência">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={dstConfig.className}>{dstConfig.label}</Badge>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
          {editandoOcorrencia && (
            <EditOcorrenciaForm
              ocorrencia={ocorrencia}
              colaboradores={colaboradores}
              onSalvar={handleSalvarOcorrencia}
              onCancelar={() => setEditandoOcorrencia(false)}
              isSaving={updateOcorrencia.isPending}
            />
          )}

          {!editandoOcorrencia && (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="border rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Solicitado</p>
                <p className="font-medium text-xs mt-0.5">{formatDate(ocorrencia.data_solicitacao ?? ocorrencia.criado_em.split('T')[0])}</p>
              </div>
              <div className="border rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Prazo</p>
                <p className="font-medium text-xs mt-0.5">{formatDate(ocorrencia.data_prevista)}</p>
              </div>
              <div className="border rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Progresso</p>
                <p className="font-medium text-xs mt-0.5">{concluidas}/{tarefas.length} ({progresso}%)</p>
              </div>
            </div>
          )}

          {(temValor || invoiceDaOcorrencia) && (
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{ocorrencia.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                {invoiceDaOcorrencia && (
                  <Badge variant="outline" className="text-xs">Fatura {invoiceDaOcorrencia.status}</Badge>
                )}
              </div>
              {podeGerarFatura && (
                <Button size="sm" variant="outline" onClick={gerarFatura} disabled={createInvoice.isPending || updateOcorrencia.isPending}>
                  Gerar Fatura Avulsa
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* Lista de tarefas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Tarefas</p>
              {podeEditar && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setNovaTarefaOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar tarefa
                </Button>
              )}
            </div>

            {tarefas.map((t, i) => {
              const stConfig    = tarefaStatusConfig[t.status]
              const isConcluida = t.status === 'concluida'
              const isImpedida  = t.status === 'impedido'
              const isSelecionada = tarefaSelecionadaId === t.id

              const respExibido = isImpedida
                ? colaboradores.find(u => u.id === t.impedimento_responsavel)?.nome
                : colaboradores.find(u => u.id === t.responsavel_id)?.nome

              return (
                <button
                  key={t.id}
                  type="button"
                  className={cn(
                    'w-full text-left border rounded-lg p-3 space-y-1.5 transition-colors group',
                    isImpedida && 'bg-orange-50/60 border-orange-200',
                    isSelecionada && 'ring-2 ring-primary border-primary',
                    ocorrencia.status !== 'cancelada' && 'hover:bg-accent/30 cursor-pointer',
                    isImpedida && ocorrencia.status !== 'cancelada' && !isSelecionada && 'hover:bg-orange-100/60',
                    ocorrencia.status === 'cancelada' && 'cursor-default opacity-70'
                  )}
                  onClick={() => handleTarefaClick(t)}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {isConcluida
                        ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                        : isImpedida
                          ? <AlertTriangle className="h-5 w-5 text-orange-500" />
                          : <Circle className="h-5 w-5 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', isConcluida && 'line-through text-muted-foreground')}>
                        {i + 1}. {t.nome}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(t.data_prevista)}
                        </span>
                        {t.data_conclusao && (
                          <span className="text-green-600">Concluído em {formatDate(t.data_conclusao)}</span>
                        )}
                        {respExibido && (
                          <span className={isImpedida ? 'text-orange-700 font-medium' : ''}>
                            {isImpedida ? `Resolução: ${respExibido}` : respExibido}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {t.checklist_progresso && t.checklist_progresso.length > 0 && (
                        <span className="text-xs text-muted-foreground/70 hidden sm:flex items-center gap-0.5">
                          <List className="h-3 w-3" />
                          {t.checklist_progresso.filter(i => i.concluido).length}/{t.checklist_progresso.length}
                        </span>
                      )}
                      {t.checklist_progresso?.some(i => i.inicio_em && !i.concluido) && (
                        <span className="text-xs text-amber-600 hidden sm:flex items-center gap-0.5">
                          <PlayCircle className="h-3 w-3 shrink-0" /> em exec.
                        </span>
                      )}
                      <Badge variant="outline" className={`text-xs ${stConfig.className}`}>{stConfig.label}</Badge>
                      {podeEditar && !isConcluida && (
                        <button
                          onClick={ev => { ev.stopPropagation(); handleDeletarTarefa(t.id) }}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-1 opacity-0 group-hover:opacity-100"
                          disabled={deleteTarefa.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isImpedida && t.impedimento_descricao ? (
                    <p className="text-xs text-orange-600/80 italic pl-8 truncate">{t.impedimento_descricao}</p>
                  ) : t.observacoes ? (
                    <p className="text-xs text-muted-foreground italic pl-8 truncate">{t.observacoes}</p>
                  ) : null}
                </button>
              )
            })}
          </div>

          {ocorrencia.status !== 'cancelada' && ocorrencia.status !== 'concluida' && (
            <>
              <Separator />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={cancelarOcorrencia}
                  disabled={updateOcorrencia.isPending}
                >
                  Cancelar ocorrência
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {!onTarefaAbrir && tarefaDetalhe && (
        <TarefaDetalheDialog
          key={tarefaDetalhe.id}
          tarefa={tarefaDetalhe}
          ocorrenciaTitulo={ocorrencia.titulo}
          ocorrenciaId={ocorrencia.id}
          clienteId={ocorrencia.cliente_id}
          clienteNome={cliente?.fantasia ?? cliente?.razao_social}
          colaboradores={colaboradores}
          onClose={() => setTarefaDetalhe(null)}
          onSalvar={handleSalvarTarefa}
          onConcluir={handleConcluirTarefa}
          isSaving={updateTarefa.isPending || concluirTarefa.isPending}
        />
      )}

      {novaTarefaOpen && (
        <NovaTarefaDialog
          ocorrencia={ocorrencia}
          totalTarefas={tarefas.length}
          colaboradores={colaboradores}
          tenantId={tenantId}
          onClose={() => setNovaTarefaOpen(false)}
          onCreate={handleCriarTarefa}
          isSaving={createTarefa.isPending}
        />
      )}
    </>
  )
}

// ─── Painel interno da tarefa ─────────────────────────────────────────────────

function TarefaPainelInterno({
  tarefa, ocorrencia, clienteNome, colaboradores, onClose,
}: {
  tarefa: Tarefa
  ocorrencia: Ocorrencia
  clienteNome?: string
  colaboradores: { id: string; nome: string }[]
  onClose: () => void
}) {
  const { toast } = useToast()
  const updateTarefa   = useUpdateTarefaNova()
  const concluirTarefa = useConcluirTarefa()

  function handleSalvar(id: string, data: Partial<Tarefa>) {
    updateTarefa.mutate({ id, data }, { onSuccess: () => toast({ title: 'Tarefa atualizada' }) })
  }

  function handleConcluir(tarefaId: string) {
    concluirTarefa.mutate(
      { tarefaId, ocorrenciaId: ocorrencia.id },
      { onSuccess: () => { toast({ title: 'Tarefa concluída' }); onClose() } }
    )
  }

  return (
    <TarefaDetalheConteudo
      tarefa={tarefa}
      ocorrenciaTitulo={ocorrencia.titulo}
      ocorrenciaId={ocorrencia.id}
      clienteId={ocorrencia.cliente_id}
      clienteNome={clienteNome}
      colaboradores={colaboradores}
      onClose={onClose}
      onSalvar={handleSalvar}
      onConcluir={handleConcluir}
      isSaving={updateTarefa.isPending || concluirTarefa.isPending}
    />
  )
}

// ─── Dialog principal ─────────────────────────────────────────────────────────

interface Props {
  ocorrencia: Ocorrencia | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function OcorrenciaDetalheDialog({ ocorrencia, open, onOpenChange }: Props) {
  const isDesktop = useIsDesktop()
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: users = [] } = useUsers(tenantId)

  const colaboradores = useMemo(
    () => users.filter(u => u.papel !== 'cliente' && u.ativo).map(u => ({ id: u.id, nome: u.nome })),
    [users]
  )

  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null)

  useEffect(() => { setTarefaSelecionada(null) }, [ocorrencia?.id])

  if (!ocorrencia) return null

  const painelTarefaAberto = isDesktop && tarefaSelecionada !== null

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) setTarefaSelecionada(null); onOpenChange(v) }}>
      <DialogContent
        className={cn(
          'p-0 gap-0 overflow-hidden flex flex-col [&>button:last-child]:hidden',
          painelTarefaAberto
            ? 'max-w-4xl h-[88vh]'
            : 'sm:max-w-2xl max-h-[90vh]'
        )}
      >
        <div className={cn('flex flex-1 min-h-0', painelTarefaAberto && 'divide-x')}>
          <div className="flex flex-col min-h-0 overflow-hidden flex-1">
            <OcorrenciaDetalheConteudo
              ocorrencia={ocorrencia}
              onClose={() => onOpenChange(false)}
              onTarefaAbrir={isDesktop ? setTarefaSelecionada : undefined}
              tarefaSelecionadaId={tarefaSelecionada?.id}
            />
          </div>

          {painelTarefaAberto && (
            <div className="flex flex-col w-80 shrink-0 min-h-0 overflow-hidden border-l-2 border-primary/30 bg-primary/[0.02]">
              <TarefaPainelInterno
                key={tarefaSelecionada!.id}
                tarefa={tarefaSelecionada}
                ocorrencia={ocorrencia}
                colaboradores={colaboradores}
                onClose={() => setTarefaSelecionada(null)}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
