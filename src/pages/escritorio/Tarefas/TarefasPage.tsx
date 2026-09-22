import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { CheckSquare, Clock, AlertTriangle, Users, Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useObrigacoes } from '@/data/hooks/useObrigacoes'
import { useTodasCompetencias } from '@/data/hooks/useCompetencias'
import { useTodasEtapas } from '@/data/hooks/useEtapasObrigacao'
import { useTarefasTenant, useUpdateTarefa, useConcluirTarefas } from '@/data/hooks/useTarefasObrigacao'
import { useDemandas, useTodasEtapasDemanda, useUpdateEtapaDemanda, useConcluirEtapaDemanda } from '@/data/hooks/useDemandas'
import { useUsers } from '@/data/hooks/useUsers'
import { formatDate } from '@/lib/utils'
import type { TarefaStatus } from '@/domain/types'

// ─── Tipos ──────────────────────────────────────────────────────────────────

type Urgencia = 'critico' | 'alta' | 'media' | 'normal'

interface TarefaUnificada {
  id: string
  tipo: 'obrigacao' | 'demanda'
  clienteNome: string
  clienteId: string
  titulo: string        // nome da etapa
  subtitulo: string     // nome da obrigação ou da demanda
  dataPrevista: string
  dataConclusao?: string
  status: TarefaStatus
  responsavelId: string
  responsavelNome: string
  urgencia: Urgencia
  descricao?: string
  observacoes?: string
  // Campos de impedimento
  impedimentoDescricao?: string
  impedimentoResponsavel?: string   // id do responsável pela resolução
  impedimentoResponsavelNome?: string
  impedimentoData?: string
  // Referências
  tarefaObrigacaoId?: string
  etapaDemandaId?: string
  demandaId?: string
}

// ─── Status / urgência config ───────────────────────────────────────────────

const statusConfig: Record<TarefaStatus, { label: string; className: string }> = {
  pendente:      { label: 'Pendente',     className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento:  { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  concluida:     { label: 'Concluída',    className: 'bg-green-100 text-green-800 border-transparent' },
  atrasada:      { label: 'Atrasada',     className: 'bg-red-100 text-red-800 border-transparent' },
  nao_se_aplica: { label: 'N/A',          className: 'bg-gray-100 text-gray-500 border-transparent' },
  impedido:      { label: 'Impedida',     className: 'bg-orange-100 text-orange-800 border-transparent' },
}

const urgenciaConfig: Record<Urgencia, { label: string; className: string }> = {
  critico: { label: 'Crítico', className: 'bg-red-600 text-white border-transparent' },
  alta:    { label: 'Alta',    className: 'bg-orange-500 text-white border-transparent' },
  media:   { label: 'Média',   className: 'bg-yellow-500 text-white border-transparent' },
  normal:  { label: '',        className: '' },
}

function calcularUrgencia(status: TarefaStatus, dataPrevista: string): Urgencia {
  // impedido usa urgência por prazo (não tem badge especial — igual obrigações)
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

function sortByUrgencia(a: TarefaUnificada, b: TarefaUnificada): number {
  const ordem: Record<Urgencia, number> = { critico: 0, alta: 1, media: 2, normal: 3 }
  const diff = ordem[a.urgencia] - ordem[b.urgencia]
  if (diff !== 0) return diff
  return a.dataPrevista.localeCompare(b.dataPrevista)
}

// ─── Dialog de detalhe da tarefa ────────────────────────────────────────────

interface TarefaDetalheDialogProps {
  tarefa: TarefaUnificada | null
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
  isSaving: boolean
}

function TarefaDetalheDialog({
  tarefa, colaboradores, onClose, onSalvar, onConcluir, isSaving,
}: TarefaDetalheDialogProps) {
  const { toast } = useToast()
  const [editStatus,  setEditStatus]  = useState<TarefaStatus>(tarefa?.status ?? 'pendente')
  const [editResp,    setEditResp]    = useState(tarefa?.responsavelId ?? '')
  const [editObs,     setEditObs]     = useState(tarefa?.observacoes ?? '')
  const [editImpDesc, setEditImpDesc] = useState(tarefa?.impedimentoDescricao ?? '')
  const [editImpResp, setEditImpResp] = useState(tarefa?.impedimentoResponsavel ?? '')

  if (!tarefa) return null

  const sc          = statusConfig[tarefa.status]
  const isConcluida = tarefa.status === 'concluida'
  const isImpedida  = tarefa.status === 'impedido'

  // Responsável exibido: quando impedido, mostra quem resolve o impedimento
  const respExibido = isImpedida
    ? (tarefa.impedimentoResponsavelNome || '—')
    : (tarefa.responsavelNome || '—')

  function handleSalvar() {
    if (!tarefa) return
    if (editStatus === 'concluida') {
      onConcluir(tarefa)
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
    onSalvar(tarefa, editStatus, editResp, editObs,
      editStatus === 'impedido' ? editImpDesc : undefined,
      editStatus === 'impedido' ? editImpResp : undefined,
    )
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg flex flex-col gap-0 p-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
          <div className="flex items-start gap-3">
            <Badge
              variant="outline"
              className={tarefa.tipo === 'obrigacao'
                ? 'text-blue-700 border-blue-300 bg-blue-50 shrink-0 mt-0.5'
                : 'text-purple-700 border-purple-300 bg-purple-50 shrink-0 mt-0.5'}
            >
              {tarefa.tipo === 'obrigacao' ? 'Obrigação' : 'Demanda'}
            </Badge>
            <div className="min-w-0">
              <DialogTitle className="leading-snug text-base">{tarefa.titulo}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {tarefa.clienteNome} · {tarefa.subtitulo}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Informações somente-leitura */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status atual</p>
              <div className="flex items-center gap-1 mt-0.5">
                {isImpedida && <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />}
                <Badge className={`text-xs ${sc.className}`}>{sc.label}</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isImpedida ? 'Responsável pela resolução' : 'Responsável'}
              </p>
              <p className="font-medium">{respExibido}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data prevista</p>
              <p>{formatDate(tarefa.dataPrevista)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data conclusão</p>
              <p>{tarefa.dataConclusao ? formatDate(tarefa.dataConclusao) : '—'}</p>
            </div>

            {/* Caixa de impedimento atual */}
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

          {!isConcluida && (
            <>
              <Separator />
              <div className="space-y-3">
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

                {/* Campos de impedimento — visíveis apenas quando status selecionado é impedido */}
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
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {!isConcluida && (
            <Button onClick={handleSalvar} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editStatus === 'concluida' ? 'Marcar como concluída' : 'Salvar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Card de tarefa ──────────────────────────────────────────────────────────

function TarefaCard({ t, onAbrir, onIniciar, onConcluir }: {
  t: TarefaUnificada
  onAbrir: (t: TarefaUnificada) => void
  onIniciar: (t: TarefaUnificada) => void
  onConcluir: (t: TarefaUnificada) => void
}) {
  const urg          = urgenciaConfig[t.urgencia]
  const st           = statusConfig[t.status]
  const isFinalizada = t.status === 'concluida' || t.status === 'nao_se_aplica'
  const isImpedida   = t.status === 'impedido'

  return (
    <div
      className={`flex items-center gap-3 p-4 border rounded-lg transition-colors cursor-pointer ${
        isImpedida
          ? 'bg-orange-50/60 border-orange-200 hover:bg-orange-100/60'
          : 'bg-card hover:bg-accent/20'
      }`}
      onClick={() => onAbrir(t)}
    >
      <Badge
        variant="outline"
        className={t.tipo === 'obrigacao'
          ? 'text-blue-700 border-blue-300 bg-blue-50 shrink-0'
          : 'text-purple-700 border-purple-300 bg-purple-50 shrink-0'}
      >
        {t.tipo === 'obrigacao' ? 'Obrigação' : 'Demanda'}
      </Badge>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{t.titulo}</p>
        <p className="text-xs text-muted-foreground truncate">{t.clienteNome} · {t.subtitulo}</p>
        {/* Quando impedido: mostra quem resolve e a descrição do impedimento */}
        {isImpedida ? (
          <>
            {t.impedimentoResponsavelNome && (
              <p className="text-xs text-orange-700 font-medium truncate">
                Resolução: {t.impedimentoResponsavelNome}
              </p>
            )}
            {t.impedimentoDescricao && (
              <p className="text-xs text-orange-600/80 italic truncate">{t.impedimentoDescricao}</p>
            )}
          </>
        ) : (
          t.responsavelNome && (
            <p className="text-xs text-muted-foreground">{t.responsavelNome}</p>
          )
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDate(t.dataPrevista)}
        </div>
        <div className="flex items-center gap-1">
          {isImpedida && <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />}
          {urg.label && (
            <Badge className={`text-xs py-0 ${urg.className}`}>{urg.label}</Badge>
          )}
          <Badge variant="outline" className={`text-xs py-0 ${st.className}`}>{st.label}</Badge>
        </div>
      </div>

      {/* Ações rápidas — stopPropagation para não abrir o dialog */}
      {!isFinalizada && (
        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {t.status !== 'em_andamento' && t.status !== 'impedido' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onIniciar(t)}
            >
              Iniciar
            </Button>
          )}
          {t.status !== 'impedido' && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => onConcluir(t)}
            >
              Concluir
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function ListaVazia({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
      <Inbox className="h-10 w-10 opacity-40" />
      <p className="text-sm">{msg}</p>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function TarefasPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()
  const isAdmin = currentUser?.papel === 'escritorio_admin'

  const { data: tarefasObs = [] }    = useTarefasTenant(tenantId)
  const { data: etapasDemanda = [] } = useTodasEtapasDemanda(tenantId)
  const { data: demandas = [] }      = useDemandas(tenantId)
  const { data: clientes = [] }      = useClients(tenantId)
  const { data: obrigacoes = [] }    = useObrigacoes(tenantId)
  const { data: competencias = [] }  = useTodasCompetencias(tenantId)
  const { data: etapasObs = [] }     = useTodasEtapas(tenantId)
  const { data: users = [] }         = useUsers(tenantId)

  const updateTarefaObs      = useUpdateTarefa()
  const concluirTarefaObs    = useConcluirTarefas()
  const updateEtapaDemanda   = useUpdateEtapaDemanda()
  const concluirEtapaDemanda = useConcluirEtapaDemanda()

  const [tarefaSelecionada, setTarefaSelecionada] = useState<TarefaUnificada | null>(null)

  const clienteMap   = useMemo(() => Object.fromEntries(clientes.map(c => [c.id, c.razao_social])), [clientes])
  const obrigacaoMap = useMemo(() => Object.fromEntries(obrigacoes.map(o => [o.id, o.nome])), [obrigacoes])
  const etapaObsMap  = useMemo(() => Object.fromEntries(etapasObs.map(e => [e.id, e])), [etapasObs])
  const compMap      = useMemo(() => Object.fromEntries(competencias.map(c => [c.id, c])), [competencias])
  const demandaMap   = useMemo(() => Object.fromEntries(demandas.map(d => [d.id, d])), [demandas])
  const userMap      = useMemo(() => Object.fromEntries(users.map(u => [u.id, u.nome])), [users])

  const colaboradores = useMemo(
    () => users.filter(u => u.papel !== 'cliente' && u.ativo).map(u => ({ id: u.id, nome: u.nome })),
    [users]
  )

  const todasUnificadas = useMemo<TarefaUnificada[]>(() => {
    const items: TarefaUnificada[] = []

    for (const t of tarefasObs) {
      const etapa = etapaObsMap[t.etapa_id]
      const comp  = compMap[t.competencia_id]
      const obr   = comp ? obrigacaoMap[comp.obrigacao_id] : undefined
      items.push({
        id: `obs-${t.id}`,
        tipo: 'obrigacao',
        clienteNome: clienteMap[t.cliente_id] ?? t.cliente_id,
        clienteId: t.cliente_id,
        titulo: etapa?.nome ?? 'Etapa',
        subtitulo: obr ?? 'Obrigação',
        dataPrevista: t.data_prevista,
        dataConclusao: t.data_conclusao,
        status: t.status,
        responsavelId: t.responsavel ?? '',
        responsavelNome: t.responsavel ? (userMap[t.responsavel] ?? t.responsavel) : '',
        urgencia: calcularUrgencia(t.status, t.data_prevista),
        descricao: etapa?.descricao,
        observacoes: t.observacoes,
        impedimentoDescricao: t.impedimento_descricao,
        impedimentoResponsavel: t.impedimento_responsavel,
        impedimentoResponsavelNome: t.impedimento_responsavel ? (userMap[t.impedimento_responsavel] ?? '') : '',
        impedimentoData: t.impedimento_data,
        tarefaObrigacaoId: t.id,
      })
    }

    for (const e of etapasDemanda) {
      const demanda = demandaMap[e.demanda_id]
      if (!demanda) continue
      items.push({
        id: `dem-${e.id}`,
        tipo: 'demanda',
        clienteNome: clienteMap[demanda.cliente_id] ?? demanda.cliente_id,
        clienteId: demanda.cliente_id,
        titulo: e.nome,
        subtitulo: demanda.titulo,
        dataPrevista: e.data_prevista,
        dataConclusao: e.data_conclusao,
        status: e.status,
        responsavelId: e.responsavel_id ?? '',
        responsavelNome: e.responsavel_id ? (userMap[e.responsavel_id] ?? '') : '',
        urgencia: calcularUrgencia(e.status, e.data_prevista),
        descricao: e.descricao,
        observacoes: e.observacoes,
        impedimentoDescricao: e.impedimento_descricao,
        impedimentoResponsavel: e.impedimento_responsavel,
        impedimentoResponsavelNome: e.impedimento_responsavel ? (userMap[e.impedimento_responsavel] ?? '') : '',
        impedimentoData: e.impedimento_data,
        etapaDemandaId: e.id,
        demandaId: e.demanda_id,
      })
    }

    return items
  }, [tarefasObs, etapasDemanda, demandaMap, clienteMap, obrigacaoMap, etapaObsMap, compMap, userMap])

  const abertas = useMemo(() =>
    todasUnificadas.filter(t => t.status !== 'concluida' && t.status !== 'nao_se_aplica'),
    [todasUnificadas])

  const meiasTarefas = useMemo(() => {
    if (isAdmin) return [...abertas].sort(sortByUrgencia)
    return abertas
      .filter(t =>
        t.responsavelId === currentUser?.id ||
        t.impedimentoResponsavel === currentUser?.id ||
        t.responsavelId === ''
      )
      .sort(sortByUrgencia)
  }, [abertas, isAdmin, currentUser])

  const atrasadas = useMemo(() =>
    todasUnificadas
      .filter(t => t.urgencia === 'critico' && t.status !== 'concluida' && t.status !== 'nao_se_aplica')
      .sort(sortByUrgencia),
    [todasUnificadas])

  const equipeTarefas = useMemo(() =>
    [...abertas].sort(sortByUrgencia),
    [abertas])

  // Ações rápidas (sem abrir dialog)
  function handleIniciar(t: TarefaUnificada) {
    if (t.tarefaObrigacaoId) {
      updateTarefaObs.mutate(
        { id: t.tarefaObrigacaoId, data: { status: 'em_andamento' } },
        { onSuccess: () => toast({ title: 'Tarefa iniciada' }) }
      )
    } else if (t.etapaDemandaId) {
      updateEtapaDemanda.mutate(
        { id: t.etapaDemandaId, data: { status: 'em_andamento' } },
        { onSuccess: () => toast({ title: 'Etapa iniciada' }) }
      )
    }
  }

  function handleConcluir(t: TarefaUnificada) {
    if (t.tarefaObrigacaoId) {
      concluirTarefaObs.mutate(
        [t.tarefaObrigacaoId],
        { onSuccess: () => toast({ title: 'Tarefa concluída' }) }
      )
    } else if (t.etapaDemandaId && t.demandaId) {
      concluirEtapaDemanda.mutate(
        { etapaId: t.etapaDemandaId, demandaId: t.demandaId },
        { onSuccess: () => toast({ title: 'Etapa concluída' }) }
      )
    }
  }

  // Salvar via dialog
  function handleSalvarDialog(
    t: TarefaUnificada,
    status: TarefaStatus,
    responsavelId: string,
    observacoes: string,
    impDesc?: string,
    impResp?: string,
  ) {
    const hoje = format(new Date(), 'yyyy-MM-dd')

    if (t.tarefaObrigacaoId) {
      updateTarefaObs.mutate(
        {
          id: t.tarefaObrigacaoId,
          data: {
            status,
            responsavel: responsavelId || undefined,
            observacoes: observacoes || undefined,
            ...(status === 'impedido'
              ? {
                  impedimento_descricao: impDesc,
                  impedimento_responsavel: impResp,
                  impedimento_data: t.impedimentoData ?? hoje,
                }
              : {
                  impedimento_descricao: undefined,
                  impedimento_responsavel: undefined,
                }),
          },
        },
        {
          onSuccess: () => {
            toast({ title: 'Tarefa atualizada' })
            setTarefaSelecionada(null)
          },
        }
      )
    } else if (t.etapaDemandaId) {
      updateEtapaDemanda.mutate(
        {
          id: t.etapaDemandaId,
          data: {
            status,
            responsavel_id: responsavelId || undefined,
            observacoes: observacoes || undefined,
            ...(status === 'impedido'
              ? {
                  impedimento_descricao: impDesc,
                  impedimento_responsavel: impResp,
                  impedimento_data: t.impedimentoData ?? hoje,
                }
              : {
                  impedimento_descricao: undefined,
                  impedimento_responsavel: undefined,
                }),
          },
        },
        {
          onSuccess: () => {
            toast({ title: 'Etapa atualizada' })
            setTarefaSelecionada(null)
          },
        }
      )
    }
  }

  function handleConcluirDialog(t: TarefaUnificada) {
    if (t.tarefaObrigacaoId) {
      concluirTarefaObs.mutate(
        [t.tarefaObrigacaoId],
        {
          onSuccess: () => {
            toast({ title: 'Tarefa concluída' })
            setTarefaSelecionada(null)
          },
        }
      )
    } else if (t.etapaDemandaId && t.demandaId) {
      concluirEtapaDemanda.mutate(
        { etapaId: t.etapaDemandaId, demandaId: t.demandaId },
        {
          onSuccess: () => {
            toast({ title: 'Etapa concluída' })
            setTarefaSelecionada(null)
          },
        }
      )
    }
  }

  const isSaving =
    updateTarefaObs.isPending ||
    concluirTarefaObs.isPending ||
    updateEtapaDemanda.isPending ||
    concluirEtapaDemanda.isPending

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
        <p className="text-muted-foreground text-sm">Obrigações e demandas em um só lugar</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Abertas', value: abertas.length, icon: Inbox, color: 'text-blue-600' },
          { label: 'Críticas / Atrasadas', value: atrasadas.length, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Total', value: todasUnificadas.length, icon: CheckSquare, color: 'text-muted-foreground' },
        ].map(item => (
          <div key={item.label} className="border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              {item.label}
            </div>
            <p className="text-2xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="meu-dia">
        <TabsList>
          <TabsTrigger value="meu-dia">Meu Dia</TabsTrigger>
          {isAdmin && <TabsTrigger value="equipe"><Users className="h-3.5 w-3.5 mr-1" />Equipe</TabsTrigger>}
          <TabsTrigger value="atrasadas">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Atrasadas
            {atrasadas.length > 0 && (
              <Badge className="ml-1 h-4 text-xs bg-red-600 text-white border-transparent px-1">
                {atrasadas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meu-dia" className="mt-4 space-y-2">
          {meiasTarefas.length === 0 ? (
            <ListaVazia msg="Nenhuma tarefa pendente para você" />
          ) : (
            meiasTarefas.map(t => (
              <TarefaCard
                key={t.id} t={t}
                onAbrir={setTarefaSelecionada}
                onIniciar={handleIniciar}
                onConcluir={handleConcluir}
              />
            ))
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="equipe" className="mt-4 space-y-2">
            {equipeTarefas.length === 0 ? (
              <ListaVazia msg="Nenhuma tarefa em aberto" />
            ) : (
              <>
                <p className="text-xs text-muted-foreground pb-1">
                  {equipeTarefas.length} tarefa{equipeTarefas.length !== 1 ? 's' : ''} em aberto
                </p>
                <Separator />
                {equipeTarefas.map(t => (
                  <TarefaCard
                    key={t.id} t={t}
                    onAbrir={setTarefaSelecionada}
                    onIniciar={handleIniciar}
                    onConcluir={handleConcluir}
                  />
                ))}
              </>
            )}
          </TabsContent>
        )}

        <TabsContent value="atrasadas" className="mt-4 space-y-2">
          {atrasadas.length === 0 ? (
            <ListaVazia msg="Nenhuma tarefa atrasada" />
          ) : (
            atrasadas.map(t => (
              <TarefaCard
                key={t.id} t={t}
                onAbrir={setTarefaSelecionada}
                onIniciar={handleIniciar}
                onConcluir={handleConcluir}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {tarefaSelecionada && (
        <TarefaDetalheDialog
          tarefa={tarefaSelecionada}
          colaboradores={colaboradores}
          onClose={() => setTarefaSelecionada(null)}
          onSalvar={handleSalvarDialog}
          onConcluir={handleConcluirDialog}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
