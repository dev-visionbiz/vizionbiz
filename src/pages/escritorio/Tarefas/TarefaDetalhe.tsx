import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import { AlertTriangle, X, List, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useUpdateChecklistTarefa } from '@/data/hooks/useOcorrencias'
import { ChecklistProgresso } from '@/components/shared/ChecklistProgresso'
import { HistoricoPanel } from '@/components/shared/HistoricoPanel'
import { useRegistrarHistoricoTarefa } from '@/data/hooks/useHistoricoTarefa'
import { formatDate } from '@/lib/utils'
import type { TarefaStatus, ChecklistItemProgresso, ChecklistItemTemplate } from '@/domain/types'

// ─── Tipos exportados ────────────────────────────────────────────────────────

export type Urgencia = 'critico' | 'alta' | 'media' | 'normal'

export interface TarefaUnificada {
  id: string
  origemRotina: boolean
  clienteNome: string
  clienteId: string
  titulo: string
  subtitulo: string
  dataPrevista: string
  dataConclusao?: string
  status: TarefaStatus
  responsavelId: string
  responsavelNome: string
  urgencia: Urgencia
  descricao?: string
  observacoes?: string
  impedimentoDescricao?: string
  impedimentoResponsavel?: string
  impedimentoResponsavelNome?: string
  impedimentoData?: string
  tarefaId: string
  ocorrenciaId: string
  fluxoTarefaId?: string
  checklistProgresso?: ChecklistItemProgresso[]
  etapaChecklist?: ChecklistItemTemplate[]
}

// ─── Config exportada ────────────────────────────────────────────────────────

export const statusConfig: Record<TarefaStatus, { label: string; className: string }> = {
  pendente:      { label: 'Pendente',     className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento:  { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  concluida:     { label: 'Concluída',    className: 'bg-green-100 text-green-800 border-transparent' },
  atrasada:      { label: 'Atrasada',     className: 'bg-red-100 text-red-800 border-transparent' },
  nao_se_aplica: { label: 'N/A',          className: 'bg-gray-100 text-gray-500 border-transparent' },
  impedido:      { label: 'Impedida',     className: 'bg-orange-100 text-orange-800 border-transparent' },
}

export const urgenciaConfig: Record<Urgencia, { label: string; className: string }> = {
  critico: { label: 'Crítico', className: 'bg-red-600 text-white border-transparent' },
  alta:    { label: 'Alta',    className: 'bg-orange-500 text-white border-transparent' },
  media:   { label: 'Média',   className: 'bg-yellow-500 text-white border-transparent' },
  normal:  { label: '',        className: '' },
}

export function calcularUrgencia(status: TarefaStatus, dataPrevista: string): Urgencia {
  if (status === 'atrasada') return 'critico'
  if (status === 'concluida' || status === 'nao_se_aplica') return 'normal'
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const prevista = new Date(dataPrevista + 'T00:00:00')
  const diff = Math.ceil((prevista.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'critico'
  if (diff < 3) return 'alta'
  if (diff < 7) return 'media'
  return 'normal'
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TarefaDetalheConteudoProps {
  tarefa: TarefaUnificada
  colaboradores: { id: string; nome: string }[]
  onClose: () => void
  onSalvar: (
    t: TarefaUnificada,
    status: TarefaStatus,
    responsavelId: string,
    observacoes: string,
    impDesc?: string,
    impResp?: string,
  ) => void
  onConcluir: (t: TarefaUnificada) => void
  onVerOrigem?: (t: TarefaUnificada) => void
  isSaving: boolean
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function TarefaDetalheConteudo({
  tarefa, colaboradores, onClose, onSalvar, onConcluir, onVerOrigem, isSaving,
}: TarefaDetalheConteudoProps) {
  const { toast } = useToast()
  const { currentUser } = useAuth()
  const tenantIdLocal = currentUser?.tenant_id ?? ''
  const updateChecklistNova = useUpdateChecklistTarefa()
  const registrar = useRegistrarHistoricoTarefa()

  const [flash, setFlash] = useState(true)
  useEffect(() => {
    setFlash(true)
    const id = setTimeout(() => setFlash(false), 1600)
    return () => clearTimeout(id)
  }, [tarefa.id])

  const [editStatus,  setEditStatus]  = useState<TarefaStatus>(tarefa.status)
  const [editResp,    setEditResp]    = useState(tarefa.responsavelId)
  const [editObs,     setEditObs]     = useState(tarefa.observacoes ?? '')
  const [editImpDesc, setEditImpDesc] = useState(tarefa.impedimentoDescricao ?? '')
  const [editImpResp, setEditImpResp] = useState(tarefa.impedimentoResponsavel ?? '')
  const [checklist,   setChecklist]   = useState<ChecklistItemProgresso[]>(() => {
    if (tarefa.checklistProgresso && tarefa.checklistProgresso.length > 0) return tarefa.checklistProgresso
    if (tarefa.etapaChecklist && tarefa.etapaChecklist.length > 0) {
      return tarefa.etapaChecklist.map((item) => ({
        id: uuidv4(), item_id: item.id, nome: item.nome, ordem: item.ordem,
        concluido: false, origem: 'template' as const,
      }))
    }
    return []
  })
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [checklistDirty,   setChecklistDirty]   = useState(false)

  useEffect(() => {
    setEditStatus(tarefa.status)
    setEditResp(tarefa.responsavelId)
    setEditObs(tarefa.observacoes ?? '')
    setEditImpDesc(tarefa.impedimentoDescricao ?? '')
    setEditImpResp(tarefa.impedimentoResponsavel ?? '')
    setShowStatusConfirm(false)
    setChecklistDirty(false)
    if (tarefa.checklistProgresso && tarefa.checklistProgresso.length > 0) {
      setChecklist(tarefa.checklistProgresso)
    } else if (tarefa.etapaChecklist && tarefa.etapaChecklist.length > 0) {
      setChecklist(tarefa.etapaChecklist.map((item) => ({
        id: uuidv4(), item_id: item.id, nome: item.nome, ordem: item.ordem,
        concluido: false, origem: 'template' as const,
      })))
    } else {
      setChecklist([])
    }
  }, [tarefa.id])

  const hasChanges =
    checklistDirty ||
    editStatus !== tarefa.status ||
    editResp !== tarefa.responsavelId ||
    editObs !== (tarefa.observacoes ?? '') ||
    editImpDesc !== (tarefa.impedimentoDescricao ?? '') ||
    editImpResp !== (tarefa.impedimentoResponsavel ?? '')

  function saveChecklist(updated: ChecklistItemProgresso[]) {
    updateChecklistNova.mutate({ id: tarefa.tarefaId, checklist_progresso: updated })
  }

  function handleChecklistToggle(itemId: string) {
    const now = format(new Date(), 'yyyy-MM-dd')
    const item = checklist.find((i) => i.id === itemId)
    const completing = item && !item.concluido
    const updated = checklist.map((i) =>
      i.id === itemId
        ? {
            ...i,
            concluido: !i.concluido,
            concluido_em: !i.concluido ? now : undefined,
            ...(completing && i.inicio_em ? { timer_pausado_em: undefined } : {}),
          }
        : i
    )
    setChecklist(updated)
    setChecklistDirty(true)
    saveChecklist(updated)
    const base = {
      tenantId: tenantIdLocal,
      tarefaId: tarefa.tarefaId,
      tarefaTipo: 'tarefa' as const,
      autorId: currentUser?.id,
      autorNome: currentUser?.nome,
    }
    if (item && !item.concluido && item.inicio_em) {
      registrar.mutate({ ...base, tipo: 'conclusao_item_checklist', meta: { checklist_item_nome: item.nome } })
    }
    if (updated.length > 0 && updated.every((i) => i.concluido)) {
      registrar.mutate({ ...base, tipo: 'checklist_completo' })
    }
  }

  function handleChecklistIniciar(itemId: string, opcoes: { observacao?: string; tempo_estimado_min?: number; usar_timer?: boolean }) {
    const item = checklist.find((i) => i.id === itemId)
    if (!item) return
    const updated = checklist.map((i) =>
      i.id === itemId
        ? { ...i, inicio_em: new Date().toISOString(), tempo_estimado_min: opcoes.tempo_estimado_min, usar_timer: opcoes.usar_timer }
        : i
    )
    setChecklist(updated)
    setChecklistDirty(true)
    saveChecklist(updated)
    registrar.mutate({
      tenantId: tenantIdLocal,
      tarefaId: tarefa.tarefaId,
      tarefaTipo: 'tarefa' as const,
      tipo: 'inicio_item_checklist',
      autorId: currentUser?.id,
      autorNome: currentUser?.nome,
      conteudo: opcoes.observacao,
      meta: { checklist_item_nome: item.nome },
    })
  }

  function handleChecklistPausar(itemId: string) {
    const item = checklist.find((i) => i.id === itemId)
    if (!item?.inicio_em) return
    const agora = new Date().toISOString()
    const decorridoMs = new Date(agora).getTime() - new Date(item.inicio_em).getTime() - (item.tempo_pausado_acumulado_ms ?? 0)
    const updated = checklist.map((i) =>
      i.id === itemId ? { ...i, timer_pausado_em: agora } : i
    )
    setChecklist(updated)
    setChecklistDirty(true)
    saveChecklist(updated)
    registrar.mutate({
      tenantId: tenantIdLocal, tarefaId: tarefa.tarefaId, tarefaTipo: 'tarefa' as const,
      tipo: 'pausa_item_checklist',
      autorId: currentUser?.id, autorNome: currentUser?.nome,
      meta: { checklist_item_nome: item.nome, tempo_decorrido_min: Math.round(decorridoMs / 60_000) },
    })
  }

  function handleChecklistRetomar(itemId: string) {
    const item = checklist.find((i) => i.id === itemId)
    if (!item?.timer_pausado_em) return
    const pausadoMs = Date.now() - new Date(item.timer_pausado_em).getTime()
    const updated = checklist.map((i) =>
      i.id === itemId
        ? { ...i, timer_pausado_em: undefined, tempo_pausado_acumulado_ms: (i.tempo_pausado_acumulado_ms ?? 0) + pausadoMs }
        : i
    )
    setChecklist(updated)
    setChecklistDirty(true)
    saveChecklist(updated)
    registrar.mutate({
      tenantId: tenantIdLocal, tarefaId: tarefa.tarefaId, tarefaTipo: 'tarefa' as const,
      tipo: 'retomada_item_checklist',
      autorId: currentUser?.id, autorNome: currentUser?.nome,
      meta: { checklist_item_nome: item.nome },
    })
  }

  function handleChecklistParar(itemId: string, observacao?: string) {
    const item = checklist.find((i) => i.id === itemId)
    if (!item) return
    const decorridoMs = item.inicio_em
      ? (item.timer_pausado_em ? new Date(item.timer_pausado_em).getTime() : Date.now())
        - new Date(item.inicio_em).getTime() - (item.tempo_pausado_acumulado_ms ?? 0)
      : 0
    const updated = checklist.map((i) =>
      i.id === itemId
        ? { ...i, inicio_em: undefined, timer_pausado_em: undefined, tempo_pausado_acumulado_ms: undefined, tempo_estimado_min: undefined, usar_timer: undefined }
        : i
    )
    setChecklist(updated)
    setChecklistDirty(true)
    saveChecklist(updated)
    registrar.mutate({
      tenantId: tenantIdLocal, tarefaId: tarefa.tarefaId, tarefaTipo: 'tarefa' as const,
      tipo: 'cancelamento_item_checklist',
      autorId: currentUser?.id, autorNome: currentUser?.nome,
      conteudo: observacao,
      meta: { checklist_item_nome: item.nome, tempo_decorrido_min: Math.round(decorridoMs / 60_000) },
    })
  }

  function handleChecklistAdicionar(nome: string) {
    const novoItem: ChecklistItemProgresso = {
      id: uuidv4(), nome, ordem: checklist.length + 1, concluido: false, origem: 'custom',
    }
    const updated = [...checklist, novoItem]
    setChecklist(updated)
    setChecklistDirty(true)
    saveChecklist(updated)
  }

  function handleChecklistRemover(itemId: string) {
    const updated = checklist.filter((i) => i.id !== itemId).map((i, n) => ({ ...i, ordem: n + 1 }))
    setChecklist(updated)
    setChecklistDirty(true)
    saveChecklist(updated)
  }

  const sc          = statusConfig[tarefa.status]
  const isConcluida = tarefa.status === 'concluida'
  const isImpedida  = tarefa.status === 'impedido'

  const respExibido = isImpedida
    ? (tarefa.impedimentoResponsavelNome || '—')
    : (tarefa.responsavelNome || '—')

  function executarSalvar() {
    const statusAnterior = tarefa.status
    const respAnterior   = tarefa.responsavelId
    const base = {
      tenantId: tenantIdLocal,
      tarefaId: tarefa.tarefaId,
      tarefaTipo: 'tarefa' as const,
      autorId: currentUser?.id,
      autorNome: currentUser?.nome,
    }
    onSalvar(tarefa, editStatus, editResp, editObs,
      editStatus === 'impedido' ? editImpDesc : undefined,
      editStatus === 'impedido' ? editImpResp : undefined,
    )
    if (editStatus !== statusAnterior) {
      registrar.mutate({ ...base, tipo: 'status_alterado', meta: { status_anterior: statusAnterior, status_novo: editStatus } })
    }
    if (editResp !== respAnterior) {
      registrar.mutate({
        ...base, tipo: 'responsavel_alterado',
        meta: {
          responsavel_anterior_nome: respAnterior ? (colaboradores.find(u => u.id === respAnterior)?.nome ?? respAnterior) : 'Nenhum',
          responsavel_novo_nome: editResp ? (colaboradores.find(u => u.id === editResp)?.nome ?? editResp) : 'Nenhum',
        },
      })
    }
    if (statusAnterior !== 'impedido' && editStatus === 'impedido') {
      registrar.mutate({ ...base, tipo: 'impedimento_registrado' })
    } else if (statusAnterior === 'impedido' && editStatus !== 'impedido') {
      registrar.mutate({ ...base, tipo: 'impedimento_resolvido' })
    }
    setChecklistDirty(false)
    setShowStatusConfirm(false)
  }

  function handleSalvar() {
    if (editStatus === 'concluida' && !isConcluida) {
      onConcluir(tarefa)
      registrar.mutate({
        tenantId: tenantIdLocal, tarefaId: tarefa.tarefaId, tarefaTipo: 'tarefa' as const,
        autorId: currentUser?.id, autorNome: currentUser?.nome,
        tipo: 'status_alterado',
        meta: { status_anterior: tarefa.status, status_novo: 'concluida' },
      })
      return
    }
    if (editStatus === 'impedido') {
      if (!editImpDesc.trim()) {
        toast({ title: 'Informe a descrição do impedimento', variant: 'destructive' })
        return
      }
      if (!editImpResp) {
        toast({ title: 'Atribua um responsável pela resolução', variant: 'destructive' })
        return
      }
    }
    if (editStatus === tarefa.status) {
      setShowStatusConfirm(true)
      return
    }
    executarSalvar()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b">
        <div className="flex items-start gap-2 px-3 pt-3 pb-2.5">
          <Badge
            variant="outline"
            className={tarefa.origemRotina
              ? 'text-blue-700 border-blue-300 bg-blue-50 shrink-0 mt-0.5'
              : 'text-emerald-700 border-emerald-300 bg-emerald-50 shrink-0 mt-0.5'}
          >
            {tarefa.origemRotina ? 'Rotina' : 'Tarefa'}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug">{tarefa.titulo}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {tarefa.clienteNome} · {tarefa.subtitulo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {onVerOrigem && (
          <button
            onClick={() => onVerOrigem(tarefa)}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors border-t ${
              tarefa.origemRotina
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100'
            } ${flash ? 'animate-origem-flash' : ''}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {tarefa.origemRotina ? 'Abrir painel da rotina de origem' : 'Abrir ocorrência de origem'}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-3 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="flex items-center gap-1 mt-0.5">
              {isImpedida && <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />}
              <Badge className={`text-xs ${sc.className}`}>{sc.label}</Badge>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {isImpedida ? 'Responsável pela resolução' : 'Responsável'}
            </p>
            <p className="font-medium">{respExibido || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Data prevista</p>
            <p>{formatDate(tarefa.dataPrevista)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Data conclusão</p>
            <p>{tarefa.dataConclusao ? formatDate(tarefa.dataConclusao) : '—'}</p>
          </div>
          {tarefa.urgencia !== 'normal' && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Prioridade</p>
              <Badge className={`text-xs mt-0.5 ${urgenciaConfig[tarefa.urgencia].className}`}>
                {urgenciaConfig[tarefa.urgencia].label}
              </Badge>
            </div>
          )}

          {isImpedida && (tarefa.impedimentoDescricao || tarefa.impedimentoResponsavelNome) && (
            <div className="col-span-2 rounded-md bg-orange-50 border border-orange-200 p-3 space-y-1">
              <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Impedimento registrado
                {tarefa.impedimentoData && (
                  <span className="font-normal text-orange-600 ml-1">
                    em {formatDate(tarefa.impedimentoData)}
                  </span>
                )}
              </p>
              {tarefa.impedimentoDescricao && (
                <p className="text-xs text-orange-700 whitespace-pre-wrap">{tarefa.impedimentoDescricao}</p>
              )}
              {tarefa.impedimentoResponsavelNome && (
                <p className="text-xs text-orange-700">
                  Responsável:{' '}
                  <span className="font-medium">{tarefa.impedimentoResponsavelNome}</span>
                </p>
              )}
            </div>
          )}

          {tarefa.descricao && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Instruções / informativo</p>
              <p className="whitespace-pre-wrap text-sm bg-muted/40 rounded-md p-3 leading-relaxed">
                {tarefa.descricao}
              </p>
            </div>
          )}

          {tarefa.observacoes && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Observações registradas</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground italic">
                {tarefa.observacoes}
              </p>
            </div>
          )}
        </div>

        {(checklist.length > 0 || !isConcluida) && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <List className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium">Checklist</p>
              </div>
              <ChecklistProgresso
                itens={checklist}
                onToggle={handleChecklistToggle}
                onAdicionar={handleChecklistAdicionar}
                onRemover={handleChecklistRemover}
                onIniciar={handleChecklistIniciar}
                onPausar={handleChecklistPausar}
                onRetomar={handleChecklistRetomar}
                onParar={handleChecklistParar}
                readonly={isConcluida}
                tarefaId={tarefa.tarefaId}
                tenantId={tenantIdLocal}
                autorId={currentUser?.id}
                autorNome={currentUser?.nome}
                tarefaTitulo={tarefa.titulo}
                clienteNome={tarefa.clienteNome}
                dataPrevista={tarefa.dataPrevista}
              />
            </div>
          </>
        )}

        <>
          <Separator />
          <div className="space-y-3">
            {isConcluida && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                Tarefa concluída — altere o status abaixo para reabrir.
              </p>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Alterar status</Label>
              <Select value={editStatus} onValueChange={v => setEditStatus(v as TarefaStatus)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['pendente', 'em_andamento', 'concluida', 'nao_se_aplica', 'impedido'] as TarefaStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editStatus === 'impedido' && (
              <div className="rounded-md bg-orange-50 border border-orange-200 p-3 space-y-3">
                <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Registrar impedimento
                </p>
                <div className="space-y-1">
                  <Label className="text-xs text-orange-800">Descrição do impedimento *</Label>
                  <Textarea
                    value={editImpDesc}
                    onChange={e => setEditImpDesc(e.target.value)}
                    rows={2}
                    className="text-sm border-orange-200 focus:ring-orange-400"
                    placeholder="O que está bloqueando esta tarefa?"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-orange-800">Responsável pela resolução *</Label>
                  <Select value={editImpResp || '_none'} onValueChange={v => setEditImpResp(v === '_none' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm border-orange-200">
                      <SelectValue placeholder="Quem vai resolver?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Selecionar responsável</SelectItem>
                      {colaboradores.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {editStatus !== 'impedido' && (
              <div className="space-y-1">
                <Label className="text-xs">Responsável</Label>
                <Select value={editResp || '_none'} onValueChange={v => setEditResp(v === '_none' ? '' : v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sem responsável</SelectItem>
                    {colaboradores.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={editObs}
                onChange={e => setEditObs(e.target.value)}
                rows={3}
                className="text-sm"
                placeholder="Anotações sobre esta tarefa..."
              />
            </div>
          </div>
        </>

        <HistoricoPanel
          tenantId={tenantIdLocal}
          tarefaId={tarefa.tarefaId}
          tarefaTipo="tarefa"
        />
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t shrink-0 flex items-center justify-between gap-2 bg-muted/30">
        <p className="text-[11px] text-muted-foreground/70 hidden xl:block">Edite e salve as alterações</p>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          <Button size="sm" onClick={handleSalvar} disabled={isSaving || !hasChanges}>
            {isSaving
              ? 'Salvando...'
              : !isConcluida && editStatus === 'concluida'
                ? 'Marcar como concluída'
                : isConcluida && editStatus !== 'concluida'
                  ? 'Reabrir tarefa'
                  : 'Salvar'}
          </Button>
        </div>
      </div>

      <Dialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <DialogContent className="sm:max-w-sm p-5">
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-sm">Status não alterado</p>
              <p className="text-xs text-muted-foreground mt-1">
                O status permanece como{' '}
                <span className="font-medium">{statusConfig[editStatus]?.label ?? editStatus}</span>.
                Deseja salvar assim mesmo?
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowStatusConfirm(false)}>
                Alterar status
              </Button>
              <Button size="sm" onClick={executarSalvar} disabled={isSaving}>
                Confirmar e salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
