import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PomodoroFloat } from '@/components/shared/PomodoroFloat'
import { useUpdateChecklistTarefa } from '@/data/hooks/useOcorrencias'
import { useRegistrarHistoricoTarefa } from '@/data/hooks/useHistoricoTarefa'
import type { ChecklistItemProgresso } from '@/domain/types'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface PomodoroAtivo {
  item: ChecklistItemProgresso
  fullChecklist: ChecklistItemProgresso[]
  tarefaId: string
  tenantId: string
  autorId?: string
  autorNome?: string
  tarefaTitulo?: string
  clienteNome?: string
  dataPrevista?: string
}

interface PomodoroContextValue {
  ativo: PomodoroAtivo | null
  visivel: boolean
  registrar(
    data: PomodoroAtivo & {
      onPausar: (id: string) => void
      onRetomar: (id: string) => void
    }
  ): void
  sincronizar(tarefaId: string, itens: ChecklistItemProgresso[]): void
  suspenderCallbacks(tarefaId: string): void
  remover(tarefaId: string): void
  reabrir(): void
}

const PomodoroCtx = createContext<PomodoroContextValue | null>(null)

export function usePomodoro() {
  const ctx = useContext(PomodoroCtx)
  if (!ctx) throw new Error('usePomodoro deve ser usado dentro de PomodoroProvider')
  return ctx
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [ativo, setAtivo]     = useState<PomodoroAtivo | null>(null)
  const [visivel, setVisivel] = useState(true)
  const navigate = useNavigate()

  // Callbacks do componente montado (null quando desmontado)
  const onPausarRef  = useRef<((id: string) => void) | null>(null)
  const onRetomarRef = useRef<((id: string) => void) | null>(null)
  const ativoRef     = useRef<PomodoroAtivo | null>(null)
  ativoRef.current   = ativo

  const updateChecklist = useUpdateChecklistTarefa()
  const registrarHist   = useRegistrarHistoricoTarefa()

  function registrar(
    data: PomodoroAtivo & { onPausar: (id: string) => void; onRetomar: (id: string) => void }
  ) {
    const { onPausar, onRetomar, ...pomodoroData } = data
    setAtivo(pomodoroData)
    setVisivel(true)
    onPausarRef.current  = onPausar
    onRetomarRef.current = onRetomar
  }

  function sincronizar(tarefaId: string, itens: ChecklistItemProgresso[]) {
    setAtivo(prev => {
      if (!prev || prev.tarefaId !== tarefaId) return prev
      const item = itens.find(i => i.id === prev.item.id) ?? prev.item
      return { ...prev, item, fullChecklist: itens }
    })
  }

  function suspenderCallbacks(tarefaId: string) {
    if (ativoRef.current?.tarefaId === tarefaId) {
      onPausarRef.current  = null
      onRetomarRef.current = null
    }
  }

  function remover(tarefaId: string) {
    if (ativoRef.current?.tarefaId === tarefaId) {
      setAtivo(null)
      onPausarRef.current  = null
      onRetomarRef.current = null
    }
  }

  function handlePausar() {
    const a = ativoRef.current
    if (!a) return

    if (onPausarRef.current) {
      // Página montada — delega (ela cuida do estado local + DB)
      onPausarRef.current(a.item.id)
      return
    }

    // Página desmontada — atualiza DB diretamente
    const agora = new Date().toISOString()
    const decorridoMs = new Date(agora).getTime()
      - new Date(a.item.inicio_em!).getTime()
      - (a.item.tempo_pausado_acumulado_ms ?? 0)
    const updatedItem     = { ...a.item, timer_pausado_em: agora }
    const updatedChecklist = a.fullChecklist.map(i => i.id === updatedItem.id ? updatedItem : i)

    setAtivo(prev => prev ? { ...prev, item: updatedItem, fullChecklist: updatedChecklist } : null)

    updateChecklist.mutate({ id: a.tarefaId, checklist_progresso: updatedChecklist })
    registrarHist.mutate({
      tenantId: a.tenantId, tarefaId: a.tarefaId, tarefaTipo: 'tarefa',
      tipo: 'pausa_item_checklist',
      autorId: a.autorId, autorNome: a.autorNome,
      meta: { checklist_item_nome: a.item.nome, tempo_decorrido_min: Math.round(decorridoMs / 60_000) },
    })
  }

  function handleRetomar() {
    const a = ativoRef.current
    if (!a) return

    if (onRetomarRef.current) {
      onRetomarRef.current(a.item.id)
      return
    }

    // Página desmontada
    const pausadoMs   = a.item.timer_pausado_em
      ? Date.now() - new Date(a.item.timer_pausado_em).getTime()
      : 0
    const updatedItem = {
      ...a.item,
      timer_pausado_em: undefined,
      tempo_pausado_acumulado_ms: (a.item.tempo_pausado_acumulado_ms ?? 0) + pausadoMs,
    }
    const updatedChecklist = a.fullChecklist.map(i => i.id === updatedItem.id ? updatedItem : i)

    setAtivo(prev => prev ? { ...prev, item: updatedItem, fullChecklist: updatedChecklist } : null)

    updateChecklist.mutate({ id: a.tarefaId, checklist_progresso: updatedChecklist })
    registrarHist.mutate({
      tenantId: a.tenantId, tarefaId: a.tarefaId, tarefaTipo: 'tarefa',
      tipo: 'retomada_item_checklist',
      autorId: a.autorId, autorNome: a.autorNome,
      meta: { checklist_item_nome: a.item.nome },
    })
  }

  function navegarParaTarefa() {
    const a = ativoRef.current
    if (!a) return
    navigate(`/escritorio/tarefas?tarefa=${a.tarefaId}`)
    setVisivel(true)
  }

  const value: PomodoroContextValue = {
    ativo,
    visivel,
    registrar,
    sincronizar,
    suspenderCallbacks,
    remover,
    reabrir: () => setVisivel(true),
  }

  return (
    <PomodoroCtx.Provider value={value}>
      {children}
      {ativo && visivel && (
        <PomodoroFloat
          item={ativo.item}
          tarefaTitulo={ativo.tarefaTitulo}
          clienteNome={ativo.clienteNome}
          dataPrevista={ativo.dataPrevista}
          onPausar={handlePausar}
          onRetomar={handleRetomar}
          onFechar={() => setVisivel(false)}
          onNavegar={navegarParaTarefa}
        />
      )}
    </PomodoroCtx.Provider>
  )
}
