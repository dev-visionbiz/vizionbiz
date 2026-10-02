import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  CheckSquare, Square, Plus, X,
  PlayCircle, Clock, PauseCircle, StopCircle, Settings2, Timer,
} from 'lucide-react'
import { usePomodoro } from '@/context/PomodoroContext'
import { format } from 'date-fns'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import type { ChecklistItemProgresso } from '@/domain/types'

// ── Utilitários de tempo ────────────────────────────────────────────────────

function calcularDecorridoMs(item: ChecklistItemProgresso): number {
  if (!item.inicio_em) return 0
  const inicio = new Date(item.inicio_em).getTime()
  const fim = item.timer_pausado_em
    ? new Date(item.timer_pausado_em).getTime()
    : Date.now()
  return Math.max(0, fim - inicio - (item.tempo_pausado_acumulado_ms ?? 0))
}

function formatarTempo(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}min`
  if (m > 0) return `${m}min ${s % 60}s`
  return `${s}s`
}

const ESTIMATIVAS: { label: string; value: number | undefined }[] = [
  { label: 'Sem estimativa', value: undefined },
  { label: '15 min',  value: 15 },
  { label: '30 min',  value: 30 },
  { label: '1 h',     value: 60 },
  { label: '2 h',     value: 120 },
  { label: '4 h',     value: 240 },
  { label: '8 h',     value: 480 },
  { label: '1 dia',   value: 1440 },
  { label: '2 dias',  value: 2880 },
]

// ── Props ───────────────────────────────────────────────────────────────────

interface IniciarOpcoes {
  observacao?: string
  tempo_estimado_min?: number
  usar_timer?: boolean
}

interface ChecklistProgressoProps {
  itens: ChecklistItemProgresso[]
  onToggle: (id: string) => void
  onAdicionar: (nome: string) => void
  onRemover: (id: string) => void
  onIniciar?: (id: string, opcoes: IniciarOpcoes) => void
  onPausar?: (id: string) => void
  onRetomar?: (id: string) => void
  onParar?: (id: string, observacao?: string) => void
  readonly?: boolean
  // Contexto do Pomodoro (necessário para o float persistir entre navegações)
  tarefaId?: string
  tenantId?: string
  autorId?: string
  autorNome?: string
  tarefaTitulo?: string
  clienteNome?: string
  dataPrevista?: string
}

// ── Componente ───────────────────────────────────────────────────────────────

export function ChecklistProgresso({
  itens,
  onToggle,
  onAdicionar,
  onRemover,
  onIniciar,
  onPausar,
  onRetomar,
  onParar,
  readonly = false,
  tarefaId,
  tenantId,
  autorId,
  autorNome,
  tarefaTitulo,
  clienteNome,
  dataPrevista,
}: ChecklistProgressoProps) {
  const [novoItem, setNovoItem] = useState('')

  // Integração com o Pomodoro global (persiste entre navegações)
  const pomodoro    = usePomodoro()
  const pomodoroRef = useRef(pomodoro)
  pomodoroRef.current = pomodoro

  const itemTimerAtivo = itens.find(i => !!i.inicio_em && !i.concluido && i.usar_timer)

  // Registrar/sincronizar Pomodoro quando itens mudam
  useEffect(() => {
    if (!tarefaId || !tenantId) return
    const p = pomodoroRef.current

    if (itemTimerAtivo) {
      p.registrar({
        item: itemTimerAtivo,
        fullChecklist: itens,
        tarefaId, tenantId, autorId, autorNome,
        tarefaTitulo, clienteNome, dataPrevista,
        onPausar:  (id) => onPausar?.(id),
        onRetomar: (id) => onRetomar?.(id),
      })
    } else if (p.ativo?.tarefaId === tarefaId) {
      p.remover(tarefaId)
    }

    p.sincronizar(tarefaId, itens)
  }, [itens, tarefaId, tenantId]) // eslint-disable-line

  // Suspender callbacks ao desmontar (float persiste mas gerencia o DB diretamente)
  useEffect(() => {
    if (!tarefaId) return
    return () => pomodoroRef.current.suspenderCallbacks(tarefaId)
  }, [tarefaId])

  // Dialog 1 — registrar início
  const [iniciarItem, setIniciarItem] = useState<ChecklistItemProgresso | null>(null)
  const [obsInicio, setObsInicio]     = useState('')
  const [estimativa, setEstimativa]   = useState<number | undefined>(undefined)
  const [usarTimer, setUsarTimer]     = useState(false)

  // Dialog 2 — gerenciar execução
  const [gerenciarItem, setGerenciarItem] = useState<ChecklistItemProgresso | null>(null)
  const [obsGerenciar, setObsGerenciar]   = useState('')
  const [confirmarParar, setConfirmarParar] = useState(false)

  // Tick para atualizar timers ao vivo
  const [tick, setTick] = useState(0)

  const temTimerAtivo = itens.some(
    (i) => i.inicio_em && !i.concluido && i.usar_timer && !i.timer_pausado_em
  )
  useEffect(() => {
    if (!temTimerAtivo) return
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [temTimerAtivo])

  // Sincroniza item gerenciado com dados externos (ex: pausa feita por outro handler)
  useEffect(() => {
    if (!gerenciarItem) return
    const atualizado = itens.find((i) => i.id === gerenciarItem.id)
    if (atualizado) setGerenciarItem(atualizado)
  }, [itens])

  const total     = itens.length
  const concluidos = itens.filter((i) => i.concluido).length
  const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0
  const sorted     = [...itens].sort((a, b) => a.ordem - b.ordem)

  function handleAdicionar() {
    const nome = novoItem.trim()
    if (!nome) return
    onAdicionar(nome)
    setNovoItem('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAdicionar()
  }

  function handleConfirmarInicio() {
    if (!iniciarItem) return
    onIniciar!(iniciarItem.id, {
      observacao: obsInicio.trim() || undefined,
      tempo_estimado_min: estimativa,
      usar_timer: usarTimer,
    })
    setIniciarItem(null)
    setObsInicio('')
    setEstimativa(undefined)
    setUsarTimer(false)
  }

  function handleAbrirGerenciar(item: ChecklistItemProgresso) {
    setGerenciarItem(item)
    setObsGerenciar('')
    setConfirmarParar(false)
  }

  function handlePausarOuRetomar() {
    if (!gerenciarItem) return
    if (gerenciarItem.timer_pausado_em) {
      onRetomar?.(gerenciarItem.id)
    } else {
      onPausar?.(gerenciarItem.id)
    }
  }

  function handleParar() {
    if (!gerenciarItem) return
    onParar?.(gerenciarItem.id, obsGerenciar.trim() || undefined)
    setGerenciarItem(null)
    setConfirmarParar(false)
  }

  function handleConcluirGerenciar() {
    if (!gerenciarItem) return
    onToggle(gerenciarItem.id)
    setGerenciarItem(null)
  }

  return (
    <div className="space-y-3">
      {/* Header: progresso */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {concluidos}/{total} concluídos
        </span>
        <span className="text-xs text-muted-foreground">{percentual}%</span>
      </div>

      <Progress value={percentual} className="h-1.5" />

      {/* Lista de itens */}
      <ul className="space-y-1">
        {sorted.map((item) => {
          const emExecucao = !!item.inicio_em && !item.concluido
          const pausado    = emExecucao && !!item.timer_pausado_em
          const decorridoMs = emExecucao ? calcularDecorridoMs(item) : 0
          const pctEstimado = item.tempo_estimado_min
            ? Math.min(100, Math.round((decorridoMs / (item.tempo_estimado_min * 60_000)) * 100))
            : null

          return (
            <li key={item.id} className="space-y-1">
              <div className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50 transition-colors">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => !readonly && onToggle(item.id)}
                  disabled={readonly}
                  className="shrink-0 text-muted-foreground hover:text-primary disabled:cursor-default"
                >
                  {item.concluido
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4" />}
                </button>

                {/* Nome + pílula Em execução */}
                <span className={`flex-1 text-sm min-w-0 ${item.concluido ? 'line-through text-muted-foreground' : ''}`}>
                  {item.nome}
                  {emExecucao && (
                    <span className={`ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium ${pausado ? 'text-muted-foreground' : 'text-amber-600'}`}>
                      {pausado
                        ? <><PauseCircle className="h-2.5 w-2.5" /> Pausado</>
                        : <><Clock className="h-2.5 w-2.5" /> Em execução</>}
                    </span>
                  )}
                  {emExecucao && item.usar_timer && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground font-mono">
                      {formatarTempo(decorridoMs)}
                    </span>
                  )}
                  {emExecucao && !item.usar_timer && item.inicio_em && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      desde {format(new Date(item.inicio_em), 'dd/MM HH:mm')}
                    </span>
                  )}
                </span>

                {/* Botão reabrir Pomodoro (quando float está fechado) */}
                {!readonly && emExecucao && item.usar_timer && !pomodoro.visivel && (
                  <button
                    type="button"
                    onClick={() => pomodoro.reabrir()}
                    title="Abrir Pomodoro"
                    className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Timer className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Botão gerenciar (para itens em execução) */}
                {!readonly && emExecucao && (onPausar || onRetomar || onParar) && (
                  <button
                    type="button"
                    onClick={() => handleAbrirGerenciar(item)}
                    title="Gerenciar execução"
                    className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Botão Play (itens não iniciados) */}
                {!readonly && !item.concluido && !item.inicio_em && onIniciar && (
                  <button
                    type="button"
                    onClick={() => { setIniciarItem(item); setObsInicio(''); setEstimativa(undefined); setUsarTimer(false) }}
                    title="Registrar início"
                    className="shrink-0 text-muted-foreground/40 hover:text-amber-500 transition-colors"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Botão remover (itens custom sem histórico) */}
                {!readonly && item.origem === 'custom' && !item.inicio_em && !item.concluido && (
                  <button
                    type="button"
                    onClick={() => onRemover(item.id)}
                    className="hidden group-hover:flex shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Mini barra de progresso vs estimativa */}
              {emExecucao && pctEstimado !== null && (
                <div className="px-1">
                  <div className="h-0.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pctEstimado >= 100 ? 'bg-destructive' : 'bg-amber-400'}`}
                      style={{ width: `${pctEstimado}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {pctEstimado}% do estimado ({ESTIMATIVAS.find(e => e.value === item.tempo_estimado_min)?.label ?? `${item.tempo_estimado_min}min`})
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Campo para adicionar item */}
      {!readonly && (
        <div className="flex gap-2">
          <Input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Adicionar passo..."
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdicionar}
            disabled={!novoItem.trim()}
            className="h-8 px-2"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ── Dialog 1: Registrar início ── */}
      <Dialog
        open={!!iniciarItem}
        onOpenChange={(open) => { if (!open) { setIniciarItem(null); setObsInicio(''); setEstimativa(undefined); setUsarTimer(false) } }}
      >
        <DialogContent className="sm:max-w-sm p-5">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <PlayCircle className="h-4 w-4 text-amber-500" />
                Registrar início
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{iniciarItem?.nome}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tempo estimado</label>
              <Select
                value={estimativa === undefined ? '__none' : String(estimativa)}
                onValueChange={(v) => setEstimativa(v === '__none' ? undefined : Number(v))}
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTIMATIVAS.map((e) => (
                    <SelectItem key={e.value ?? '__none'} value={e.value === undefined ? '__none' : String(e.value)}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="usar-timer"
                type="checkbox"
                checked={usarTimer}
                onChange={(e) => setUsarTimer(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <label htmlFor="usar-timer" className="text-sm cursor-pointer select-none">
                Usar cronômetro (contador ao vivo)
              </label>
            </div>

            <Textarea
              value={obsInicio}
              onChange={(e) => setObsInicio(e.target.value)}
              placeholder="Observação (opcional) — ex: nº protocolo, link..."
              rows={3}
              className="text-sm resize-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleConfirmarInicio() }}
            />

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" className="h-8 text-xs"
                onClick={() => { setIniciarItem(null); setObsInicio(''); setEstimativa(undefined); setUsarTimer(false) }}>
                Cancelar
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={handleConfirmarInicio}>
                <PlayCircle className="h-3.5 w-3.5 mr-1" />
                Iniciar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: Gerenciar execução ── */}
      <Dialog
        open={!!gerenciarItem}
        onOpenChange={(open) => { if (!open) { setGerenciarItem(null); setConfirmarParar(false) } }}
      >
        <DialogContent className="sm:max-w-sm p-5">
          {gerenciarItem && (() => {
            const decorridoMs2   = calcularDecorridoMs(gerenciarItem)
            const estLabel       = ESTIMATIVAS.find(e => e.value === gerenciarItem.tempo_estimado_min)?.label
            const pct2           = gerenciarItem.tempo_estimado_min
              ? Math.min(100, Math.round((decorridoMs2 / (gerenciarItem.tempo_estimado_min * 60_000)) * 100))
              : null
            const estaPausado    = !!gerenciarItem.timer_pausado_em

            return (
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Execução em andamento
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{gerenciarItem.nome}</p>
                </div>

                {/* Timer ou data de início */}
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-1.5">
                  {gerenciarItem.usar_timer ? (
                    <p className="font-mono text-2xl font-semibold text-amber-700 text-center">
                      {formatarTempo(decorridoMs2)}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 text-center">
                      Iniciado em {format(new Date(gerenciarItem.inicio_em!), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  )}
                  {estLabel && gerenciarItem.tempo_estimado_min && (
                    <>
                      <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${(pct2 ?? 0) >= 100 ? 'bg-destructive' : 'bg-amber-400'}`}
                          style={{ width: `${pct2}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-amber-600 text-center">
                        {pct2}% do estimado · {estLabel}
                      </p>
                    </>
                  )}
                  {estaPausado && (
                    <p className="text-[10px] text-muted-foreground text-center">Pausado</p>
                  )}
                </div>

                {/* Observação */}
                <Textarea
                  value={obsGerenciar}
                  onChange={(e) => setObsGerenciar(e.target.value)}
                  placeholder="Anotação (salva no histórico)..."
                  rows={2}
                  className="text-sm resize-none"
                />

                {/* Botões de ação */}
                {!confirmarParar ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      {/* Pausar / Retomar */}
                      {(onPausar || onRetomar) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs flex-1"
                          onClick={handlePausarOuRetomar}
                        >
                          {estaPausado
                            ? <><PlayCircle className="h-3.5 w-3.5 mr-1 text-green-600" /> Retomar</>
                            : <><PauseCircle className="h-3.5 w-3.5 mr-1 text-amber-500" /> Pausar</>}
                        </Button>
                      )}
                      {/* Concluir */}
                      <Button
                        size="sm"
                        className="h-8 text-xs flex-1"
                        onClick={handleConcluirGerenciar}
                      >
                        <CheckSquare className="h-3.5 w-3.5 mr-1" /> Concluir
                      </Button>
                    </div>
                    {/* Parar */}
                    {onParar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                        onClick={() => setConfirmarParar(true)}
                      >
                        <StopCircle className="h-3.5 w-3.5 mr-1" /> Parar execução
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 rounded-md border border-destructive/30 p-3">
                    <p className="text-xs font-medium text-destructive">
                      Confirma parar esta execução? O item volta ao estado não iniciado.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => setConfirmarParar(false)}>
                        Cancelar
                      </Button>
                      <Button variant="destructive" size="sm" className="h-7 text-xs flex-1" onClick={handleParar}>
                        Parar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function buildChecklistProgresso(
  itens: ChecklistItemProgresso[]
): ChecklistItemProgresso[] {
  return itens
}

export function criarItemCustom(nome: string, ordemAtual: number): ChecklistItemProgresso {
  return {
    id: uuidv4(),
    nome,
    ordem: ordemAtual,
    concluido: false,
    origem: 'custom',
  }
}
