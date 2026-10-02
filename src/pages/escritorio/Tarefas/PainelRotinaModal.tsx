import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import {
  LayoutDashboard, ClipboardList, ChevronRight,
  Users, MousePointerClick, Check, CheckCircle2,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useAllRotinaClientes, useAllCiclos, useRotinasAtivas } from '@/data/hooks/useRotinas'
import { useOcorrencias, useTodasTarefas, useUpdateTarefaNova, useConcluirTarefa } from '@/data/hooks/useOcorrencias'
import { useClients } from '@/data/hooks/useClients'
import { useUsers } from '@/data/hooks/useUsers'
import { useFluxoTarefas } from '@/data/hooks/useFluxos'
import { cn } from '@/lib/utils'
import type { TarefaStatus } from '@/domain/types'
import {
  type TarefaUnificada, statusConfig, calcularUrgencia,
  TarefaDetalheConteudo,
} from './TarefaDetalhe'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcularStatusAgregado(ocorrencias: { status: string }[]): string {
  if (ocorrencias.length === 0) return 'sem_ciclo'
  if (ocorrencias.every(o => o.status === 'concluida')) return 'concluida'
  if (ocorrencias.some(o => o.status === 'em_andamento')) return 'em_andamento'
  return 'pendente'
}

function formatarPeriodo(periodo: string): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const [year, month] = periodo.split('-')
  const idx = parseInt(month, 10) - 1
  return `${meses[idx] ?? month}/${year}`
}

// ─── Status badges ────────────────────────────────────────────────────────────

const ocorrenciaStatusConfig: Record<string, { label: string; className: string }> = {
  pendente:     { label: 'Pendente',     className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento: { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  concluida:    { label: 'Concluída',    className: 'bg-green-100 text-green-800 border-transparent' },
  cancelada:    { label: 'Cancelada',    className: 'bg-gray-100 text-gray-600 border-transparent' },
  sem_ciclo:    { label: 'Sem ciclo',    className: 'bg-gray-100 text-gray-400 border-transparent' },
}

// ─── Componente ──────────────────────────────────────────────────────────────

interface PainelRotinaModalProps {
  open: boolean
  onClose: () => void
  rotinaId: string
  cicloId: string
  initialEtapaId?: string
  initialClienteId?: string
}

export default function PainelRotinaModal({ open, onClose, rotinaId, cicloId, initialEtapaId, initialClienteId }: PainelRotinaModalProps) {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()

  const { data: rotinas        = [] } = useRotinasAtivas(tenantId)
  const { data: rotinaClientes = [] } = useAllRotinaClientes(tenantId)
  const { data: ciclos         = [] } = useAllCiclos(tenantId)
  const { data: ocorrencias    = [] } = useOcorrencias(tenantId)
  const { data: tarefas        = [] } = useTodasTarefas(tenantId)
  const { data: clientes       = [] } = useClients(tenantId)
  const { data: users          = [] } = useUsers(tenantId)

  const updateTarefa   = useUpdateTarefaNova()
  const concluirTarefa = useConcluirTarefa()

  const [selectedEtapaId,   setSelectedEtapaId]   = useState<string | null>(initialEtapaId ?? null)
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(initialClienteId ?? null)

  useEffect(() => {
    setSelectedEtapaId(initialEtapaId ?? null)
    setSelectedClienteId(initialClienteId ?? null)
  }, [rotinaId, cicloId, initialEtapaId, initialClienteId])

  // ── Derivações ────────────────────────────────────────────────────────────

  const selectedRotina = useMemo(
    () => rotinas.find(r => r.id === rotinaId) ?? null,
    [rotinas, rotinaId],
  )

  const currentCiclo = useMemo(
    () => ciclos.find(c => c.id === cicloId) ?? null,
    [ciclos, cicloId],
  )

  const cicloOcorrencias = useMemo(
    () => ocorrencias.filter(o => o.ciclo_id === cicloId),
    [ocorrencias, cicloId],
  )

  const rotinaClienteLinks = useMemo(
    () => rotinaClientes.filter(rc => rc.rotina_id === rotinaId && rc.ativo),
    [rotinaClientes, rotinaId],
  )

  const { data: fluxoTarefas = [] } = useFluxoTarefas(tenantId, selectedRotina?.fluxo_id ?? '')

  const clienteMap = useMemo(
    () => Object.fromEntries(clientes.map(c => [c.id, c.razao_social])),
    [clientes],
  )

  const userMap = useMemo(
    () => Object.fromEntries(users.map(u => [u.id, u.nome])),
    [users],
  )

  const colaboradores = useMemo(
    () => users.filter(u => u.papel !== 'cliente' && u.ativo).map(u => ({ id: u.id, nome: u.nome })),
    [users],
  )

  // ── Tarefa selecionada ────────────────────────────────────────────────────

  const selectedOcorrencia = useMemo(
    () => (selectedClienteId
      ? cicloOcorrencias.find(o => o.cliente_id === selectedClienteId)
      : undefined),
    [cicloOcorrencias, selectedClienteId],
  )

  const selectedTarefaRaw = useMemo(
    () => (selectedEtapaId && selectedOcorrencia
      ? tarefas.find(t => t.fluxo_tarefa_id === selectedEtapaId && t.ocorrencia_id === selectedOcorrencia.id)
      : undefined),
    [tarefas, selectedEtapaId, selectedOcorrencia],
  )

  const selectedTarefaUnificada = useMemo<TarefaUnificada | null>(() => {
    if (!selectedTarefaRaw || !selectedOcorrencia) return null
    const t = selectedTarefaRaw
    return {
      id: `tar-${t.id}`,
      origemRotina: true,
      clienteNome: selectedOcorrencia.cliente_id ? (clienteMap[selectedOcorrencia.cliente_id] ?? '') : 'Interno',
      clienteId: selectedOcorrencia.cliente_id ?? '',
      titulo: t.nome,
      subtitulo: selectedOcorrencia.titulo,
      dataPrevista: t.data_prevista,
      dataConclusao: t.data_conclusao,
      status: t.status,
      responsavelId: t.responsavel_id ?? '',
      responsavelNome: t.responsavel_id ? (userMap[t.responsavel_id] ?? '') : '',
      urgencia: calcularUrgencia(t.status, t.data_prevista),
      descricao: t.descricao,
      observacoes: t.observacoes,
      impedimentoDescricao: t.impedimento_descricao,
      impedimentoResponsavel: t.impedimento_responsavel,
      impedimentoResponsavelNome: t.impedimento_responsavel ? (userMap[t.impedimento_responsavel] ?? '') : '',
      impedimentoData: t.impedimento_data,
      tarefaId: t.id,
      ocorrenciaId: t.ocorrencia_id,
      checklistProgresso: t.checklist_progresso,
    }
  }, [selectedTarefaRaw, selectedOcorrencia, clienteMap, userMap])

  // ── Progresso de etapas ───────────────────────────────────────────────────

  const cicloOcorrenciaIds = useMemo(
    () => new Set(cicloOcorrencias.map(o => o.id)),
    [cicloOcorrencias],
  )

  function getProgressoEtapa(fluxoTarefaId: string) {
    const stepTarefas = tarefas.filter(
      t => t.fluxo_tarefa_id === fluxoTarefaId && cicloOcorrenciaIds.has(t.ocorrencia_id),
    )
    return {
      concluidas: stepTarefas.filter(t => t.status === 'concluida').length,
      total: stepTarefas.length,
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSelectEtapa(fluxoTarefaId: string) {
    setSelectedEtapaId(fluxoTarefaId)
    setSelectedClienteId(null)
  }

  function handleSelectCliente(clienteId: string) {
    setSelectedClienteId(clienteId)
  }

  function handleSalvar(
    t: TarefaUnificada,
    status: TarefaStatus,
    responsavelId: string,
    observacoes: string,
    impDesc?: string,
    impResp?: string,
  ) {
    const hoje = format(new Date(), 'yyyy-MM-dd')
    updateTarefa.mutate(
      {
        id: t.tarefaId,
        data: {
          status,
          responsavel_id: responsavelId || undefined,
          observacoes: observacoes || undefined,
          ...(status === 'impedido'
            ? { impedimento_descricao: impDesc, impedimento_responsavel: impResp, impedimento_data: t.impedimentoData ?? hoje }
            : { impedimento_descricao: undefined, impedimento_responsavel: undefined }),
        },
      },
      { onSuccess: () => toast({ title: 'Tarefa atualizada' }) },
    )
  }

  function handleConcluir(t: TarefaUnificada) {
    concluirTarefa.mutate(
      { tarefaId: t.tarefaId, ocorrenciaId: t.ocorrenciaId },
      { onSuccess: () => toast({ title: 'Tarefa concluída' }) },
    )
  }

  const isSaving = updateTarefa.isPending || concluirTarefa.isPending

  const cicloStatus = calcularStatusAgregado(cicloOcorrencias)
  const statusBadgeCiclo = ocorrenciaStatusConfig[cicloStatus]

  const selectedEtapaNome = selectedEtapaId
    ? (fluxoTarefas.find(ft => ft.id === selectedEtapaId)?.nome ?? '')
    : null

  const selectedClienteNome = selectedClienteId
    ? (clienteMap[selectedClienteId] ?? '')
    : null

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-[95vw] w-300 h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">

        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            Painel de Rotinas
          </DialogTitle>
        </DialogHeader>

        {/* ── Cabeçalho breadcrumb ─────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-b shrink-0 bg-muted/20 flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-sm">{selectedRotina?.nome ?? '—'}</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          <span className="text-sm text-muted-foreground">
            {currentCiclo ? formatarPeriodo(currentCiclo.periodo) : '—'}
          </span>
          {selectedEtapaNome && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <span className="text-sm text-muted-foreground truncate max-w-48">{selectedEtapaNome}</span>
            </>
          )}
          {selectedClienteNome && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <span className="text-sm font-medium truncate max-w-48">{selectedClienteNome}</span>
            </>
          )}
          <Badge
            variant="outline"
            className={`ml-auto shrink-0 text-xs ${statusBadgeCiclo.className}`}
          >
            {statusBadgeCiclo.label}
          </Badge>
        </div>

        {/* ── 3 colunas: ETAPAS | CLIENTES | A TAREFA ─────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden divide-x">

          {/* ── ETAPAS ─────────────────────────────────────────────────── */}
          <div className="w-48 shrink-0 flex flex-col overflow-hidden">
            <p className="px-3 pt-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
              Etapas
            </p>
            <div className="overflow-y-auto flex-1 px-3 pb-3 space-y-1.5">
              {!selectedRotina?.fluxo_id ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Sem fluxo definido</p>
              ) : fluxoTarefas.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Sem etapas cadastradas</p>
              ) : (
                [...fluxoTarefas]
                  .sort((a, b) => a.ordem - b.ordem)
                  .map(ft => {
                    const { concluidas, total } = getProgressoEtapa(ft.id)
                    const completo   = total > 0 && concluidas === total
                    const isSelected = selectedEtapaId === ft.id
                    return (
                      <button
                        key={ft.id}
                        onClick={() => handleSelectEtapa(ft.id)}
                        className={cn(
                          'w-full text-left rounded-md border p-2.5 transition-colors hover:bg-accent/40',
                          isSelected && 'ring-1 ring-primary border-primary bg-accent/30',
                          completo && !isSelected && 'border-green-200 bg-green-50/50',
                        )}
                      >
                        <p className={cn(
                          'text-xs font-medium leading-snug',
                          completo && 'text-green-700',
                          isSelected && 'text-primary',
                        )}>
                          {ft.ordem}. {ft.nome}
                        </p>
                        {total > 0 ? (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  completo ? 'bg-green-500' : 'bg-primary',
                                )}
                                style={{ width: `${(concluidas / total) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {concluidas}/{total}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground/60 mt-1">Sem tarefas geradas</p>
                        )}
                      </button>
                    )
                  })
              )}
            </div>
          </div>

          {/* ── CLIENTES ───────────────────────────────────────────────── */}
          <div className="w-80 shrink-0 flex flex-col overflow-hidden">
            <p className="px-3 pt-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 border-b">
              Clientes
            </p>
            <div className="overflow-y-auto flex-1">
              {!selectedEtapaId ? (
                <div className="px-3 py-10 text-center text-muted-foreground">
                  <MousePointerClick className="h-8 w-8 mx-auto opacity-25 mb-2" />
                  <p className="text-xs">Selecione uma etapa para ver o andamento por cliente</p>
                </div>
              ) : rotinaClienteLinks.length === 0 ? (
                <div className="px-3 py-10 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto opacity-25 mb-2" />
                  <p className="text-xs">Nenhum cliente vinculado</p>
                </div>
              ) : !currentCiclo ? (
                <p className="px-3 py-6 text-xs text-muted-foreground text-center">
                  Nenhum ciclo aberto para esta rotina
                </p>
              ) : (() => {
                type ClienteRow = {
                  id: string
                  clienteId: string
                  nome: string
                  stepStatus: string
                  oc: typeof cicloOcorrencias[number] | undefined
                }
                const rows: ClienteRow[] = rotinaClienteLinks.map(rc => {
                  const oc = cicloOcorrencias.find(o => o.cliente_id === rc.cliente_id)
                  const tarefaStep = oc
                    ? tarefas.find(t => t.fluxo_tarefa_id === selectedEtapaId && t.ocorrencia_id === oc.id)
                    : undefined
                  return {
                    id: rc.id,
                    clienteId: rc.cliente_id,
                    nome: clienteMap[rc.cliente_id] ?? rc.cliente_id,
                    stepStatus: tarefaStep?.status ?? (oc ? 'pendente' : 'sem_ciclo'),
                    oc,
                  }
                })
                const pendentes  = rows.filter(r => r.stepStatus !== 'concluida')
                const concluidos = rows.filter(r => r.stepStatus === 'concluida')

                return (
                  <>
                    <div className="px-3 pt-2.5 pb-1 flex items-center justify-between sticky top-0 bg-background z-10">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pendentes</span>
                      <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground font-medium">{pendentes.length}</span>
                    </div>

                    {pendentes.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <CheckCircle2 className="h-7 w-7 mx-auto text-green-400 mb-1.5" />
                        <p className="text-xs text-muted-foreground">Todos concluídos nesta etapa</p>
                      </div>
                    ) : (
                      pendentes.map(row => {
                        const sc = statusConfig[row.stepStatus as TarefaStatus] ?? ocorrenciaStatusConfig[row.stepStatus]
                        return (
                          <button
                            key={row.id}
                            onClick={() => row.oc && handleSelectCliente(row.clienteId)}
                            disabled={!row.oc}
                            className={cn(
                              'w-full text-left px-3 py-3 flex items-center gap-3 border-l-2 transition-colors',
                              row.oc ? 'hover:bg-accent/50 cursor-pointer' : 'opacity-40 cursor-default',
                              row.stepStatus === 'atrasada'     && 'border-red-400',
                              row.stepStatus === 'em_andamento' && 'border-yellow-400',
                              row.stepStatus === 'impedido'     && 'border-orange-400',
                              row.stepStatus === 'pendente'     && 'border-blue-300',
                              row.stepStatus === 'sem_ciclo'    && 'border-transparent',
                              selectedClienteId === row.clienteId && 'bg-accent',
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{row.nome}</p>
                              <Badge variant="outline" className={`text-[10px] mt-1 px-1.5 py-px ${sc?.className ?? ''}`}>
                                {sc?.label ?? row.stepStatus}
                              </Badge>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          </button>
                        )
                      })
                    )}

                    {concluidos.length > 0 && (
                      <>
                        <div className="px-3 pt-3 pb-1 flex items-center gap-2">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 shrink-0">
                            Concluídos · {concluidos.length}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        {concluidos.map(row => (
                          <button
                            key={row.id}
                            onClick={() => row.oc && handleSelectCliente(row.clienteId)}
                            className={cn(
                              'w-full text-left px-3 py-2 flex items-center gap-2.5 border-l-2 border-green-200 hover:bg-accent/30 transition-colors',
                              selectedClienteId === row.clienteId && 'bg-accent',
                            )}
                          >
                            <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            <p className="text-sm text-muted-foreground line-through truncate">{row.nome}</p>
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )
              })()}
            </div>
          </div>

          {/* ── A TAREFA ───────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {!selectedEtapaId || !selectedClienteId ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center px-4">
                  <MousePointerClick className="h-8 w-8 mx-auto opacity-20 mb-2" />
                  <p className="text-xs">
                    {!selectedEtapaId
                      ? 'Selecione uma etapa e depois um cliente'
                      : 'Selecione um cliente para ver a tarefa'}
                  </p>
                </div>
              </div>
            ) : !selectedTarefaUnificada ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-muted-foreground px-6 text-center">
                  Nenhuma tarefa encontrada para esta etapa e cliente no ciclo atual
                </p>
              </div>
            ) : (
              <TarefaDetalheConteudo
                tarefa={selectedTarefaUnificada}
                colaboradores={colaboradores}
                onClose={() => setSelectedClienteId(null)}
                onSalvar={handleSalvar}
                onConcluir={handleConcluir}
                isSaving={isSaving}
              />
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
