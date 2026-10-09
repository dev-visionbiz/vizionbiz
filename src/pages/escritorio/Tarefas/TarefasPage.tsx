import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Clock, AlertTriangle, Users, Inbox, CheckCircle2, List, PlayCircle, LayoutDashboard, Plus, SlidersHorizontal, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useTodasTarefas, useOcorrencias, useUpdateTarefaNova, useConcluirTarefa } from '@/data/hooks/useOcorrencias'
import { useRegistrarHistoricoTarefa } from '@/data/hooks/useHistoricoTarefa'
import { useUsers } from '@/data/hooks/useUsers'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { formatDate, cn } from '@/lib/utils'
import type { TarefaStatus, Ocorrencia } from '@/domain/types'
import PainelRotinaModal from './PainelRotinaModal'
import CatalogoRotinasModal from './CatalogoRotinasModal'
import { NovaOcorrenciaDialog } from '../Ocorrencias/NovaOcorrenciaDialog'
import { OcorrenciaDetalheDialog } from '../Ocorrencias/OcorrenciaDetalheDialog'
import {
  type Urgencia, type TarefaUnificada,
  statusConfig, urgenciaConfig, calcularUrgencia,
  TarefaDetalheConteudo,
} from './TarefaDetalhe'

// â”€â”€â”€ ClienteCombobox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ClienteCombobox({
  clientes,
  value,
  onChange,
}: {
  clientes: { id: string; razao_social: string }[]
  value: string
  onChange: (id: string) => void
}) {
  const selected   = clientes.find(c => c.id === value)
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const containerRef        = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const filtered = useMemo(() => {
    if (!query) return clientes
    const q = query.toLowerCase()
    return clientes.filter(c => c.razao_social.toLowerCase().includes(q))
  }, [clientes, query])

  function handleSelect(c: { id: string; razao_social: string }) {
    onChange(c.id)
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center h-8 rounded-md border border-input bg-background text-sm ring-offset-background cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        {open ? (
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="Buscar cliente..."
            className="flex-1 px-3 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        ) : (
          <span className={cn('flex-1 px-3 truncate', !selected && 'text-muted-foreground')}>
            {selected?.razao_social ?? 'Todos os clientes'}
          </span>
        )}
        {selected ? (
          <button
            className="px-2 text-muted-foreground hover:text-foreground"
            onMouseDown={handleClear}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="px-2 text-muted-foreground pointer-events-none">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 min-w-[220px] bg-popover border rounded-md shadow-md max-h-[220px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</p>
          ) : (
            filtered.map(c => (
              <div
                key={c.id}
                className={cn(
                  'px-3 py-1.5 text-sm cursor-pointer hover:bg-accent',
                  value === c.id && 'bg-accent font-medium',
                )}
                onMouseDown={e => { e.preventDefault(); handleSelect(c) }}
              >
                {c.razao_social}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ sortByUrgencia â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function sortByUrgencia(a: TarefaUnificada, b: TarefaUnificada): number {
  const ordem: Record<Urgencia, number> = { critico: 0, alta: 1, media: 2, normal: 3 }
  const diff = ordem[a.urgencia] - ordem[b.urgencia]
  if (diff !== 0) return diff
  return a.dataPrevista.localeCompare(b.dataPrevista)
}

// â”€â”€â”€ Dialog wrapper (mobile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  onVerOrigem: (t: TarefaUnificada) => void
  isSaving: boolean
}

function TarefaDetalheDialog({
  tarefa, colaboradores, onClose, onSalvar, onConcluir, onVerOrigem, isSaving,
}: TarefaDetalheDialogProps) {
  if (!tarefa) return null
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg flex flex-col gap-0 p-0 max-h-[90vh] overflow-hidden">
        <TarefaDetalheConteudo
          tarefa={tarefa}
          colaboradores={colaboradores}
          onClose={onClose}
          onSalvar={onSalvar}
          onConcluir={onConcluir}
          onVerOrigem={onVerOrigem}
          isSaving={isSaving}
        />
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Card de tarefa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TarefaCard({ t, isSelected, onAbrir, onIniciar, onConcluir }: {
  t: TarefaUnificada
  isSelected: boolean
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
      className={cn(
        'flex items-center gap-3 p-4 border rounded-lg transition-colors cursor-pointer',
        isImpedida
          ? 'bg-orange-50/60 border-orange-200 hover:bg-orange-100/60'
          : 'bg-card hover:bg-accent/20',
        isSelected && 'ring-2 ring-primary border-primary',
      )}
      onClick={() => onAbrir(t)}
    >
      <Badge
        variant="outline"
        className={t.origemRotina
          ? 'text-blue-700 border-blue-300 bg-blue-50 shrink-0'
          : 'text-emerald-700 border-emerald-300 bg-emerald-50 shrink-0'}
      >
        {t.origemRotina ? 'Rotina' : 'Tarefa'}
      </Badge>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{t.titulo}</p>
        <p className="text-xs text-muted-foreground truncate">{t.clienteNome} · {t.subtitulo}</p>
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
          {t.checklistProgresso && t.checklistProgresso.length > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5 hidden sm:flex">
              <List className="h-3 w-3" />
              {t.checklistProgresso.filter(i => i.concluido).length}/{t.checklistProgresso.length}
            </span>
          )}
          {(() => {
            const ativos = t.checklistProgresso?.filter(i => i.inicio_em && !i.concluido) ?? []
            if (!ativos.length) return null
            const label = ativos.length === 1 ? ativos[0].nome : `${ativos.length} em execução`
            return (
              <span className="text-xs text-amber-600 hidden sm:flex items-center gap-0.5 max-w-[120px] truncate">
                <PlayCircle className="h-3 w-3 shrink-0" />
                <span className="truncate">{label}</span>
              </span>
            )
          })()}
          {urg.label && (
            <Badge className={`text-xs py-0 ${urg.className}`}>{urg.label}</Badge>
          )}
          <Badge variant="outline" className={`text-xs py-0 ${st.className}`}>{st.label}</Badge>
        </div>
      </div>

      {!isFinalizada && (
        <div className="hidden sm:flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
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

// â”€â”€â”€ Página principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TarefasPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()
  const isAdmin   = currentUser?.papel === 'escritorio_admin'
  const isDesktop = useIsDesktop()

  const [searchParams, setSearchParams] = useSearchParams()

  const { data: novasTarefas = [] } = useTodasTarefas(tenantId)
  const { data: ocorrencias = [] }  = useOcorrencias(tenantId)
  const { data: clientes = [] }     = useClients(tenantId)
  const { data: users = [] }        = useUsers(tenantId)

  const updateTarefaNova   = useUpdateTarefaNova()
  const concluirTarefa     = useConcluirTarefa()
  const registrarHistorico = useRegistrarHistoricoTarefa()

  const [tarefaSelecionada,   setTarefaSelecionada]   = useState<TarefaUnificada | null>(null)
  const [catalogoOpen,        setCatalogoOpen]        = useState(false)
  const [painelRotina,        setPainelRotina]        = useState<{ rotinaId: string; cicloId: string; initialEtapaId?: string; initialClienteId?: string } | null>(null)
  const [novaOcorrenciaOpen,  setNovaOcorrenciaOpen]  = useState(false)
  const [ocorrenciaDetalhe,   setOcorrenciaDetalhe]   = useState<Ocorrencia | null>(null)

  const [filtrosOpen,      setFiltrosOpen]      = useState(false)
  const [filtroCliente,    setFiltroCliente]    = useState('')
  const [filtroStatus,     setFiltroStatus]     = useState<TarefaStatus | ''>('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim,    setFiltroDataFim]    = useState('')

  const filtrosAtivos = filtroCliente !== '' || filtroStatus !== '' || filtroDataInicio !== '' || filtroDataFim !== ''

  function limparFiltros() {
    setFiltroCliente('')
    setFiltroStatus('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
  }

  function handleSelectRotina(rotinaId: string, cicloId: string) {
    setCatalogoOpen(false)
    setPainelRotina({ rotinaId, cicloId })
  }

  function handleVerOrigem(tarefa: TarefaUnificada) {
    const ocorrencia = ocorrenciaMap[tarefa.ocorrenciaId]
    if (!ocorrencia) return
    if (tarefa.origemRotina) {
      if (ocorrencia.rotina_id && ocorrencia.ciclo_id) {
        setPainelRotina({
          rotinaId: ocorrencia.rotina_id,
          cicloId: ocorrencia.ciclo_id,
          initialEtapaId: tarefa.fluxoTarefaId,
          initialClienteId: tarefa.clienteId || undefined,
        })
      } else {
        setCatalogoOpen(true)
      }
    } else {
      setOcorrenciaDetalhe(ocorrencia)
    }
  }

  const clienteMap    = useMemo(() => Object.fromEntries(clientes.map(c => [c.id, c.razao_social])), [clientes])
  const ocorrenciaMap = useMemo(() => Object.fromEntries(ocorrencias.map(o => [o.id, o])), [ocorrencias])
  const userMap       = useMemo(() => Object.fromEntries(users.map(u => [u.id, u.nome])), [users])

  const colaboradores = useMemo(
    () => users.filter(u => u.papel !== 'cliente' && u.ativo).map(u => ({ id: u.id, nome: u.nome })),
    [users]
  )

  const todasUnificadas = useMemo<TarefaUnificada[]>(() => {
    const items: TarefaUnificada[] = []

    for (const t of novasTarefas) {
      const ocorrencia = ocorrenciaMap[t.ocorrencia_id]
      if (!ocorrencia) continue
      items.push({
        id: `tar-${t.id}`,
        origemRotina: ocorrencia.origem === 'rotina',
        clienteNome: ocorrencia.cliente_id ? (clienteMap[ocorrencia.cliente_id] ?? ocorrencia.cliente_id) : 'Interno',
        clienteId: ocorrencia.cliente_id ?? '',
        titulo: t.nome,
        subtitulo: ocorrencia.titulo,
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
        fluxoTarefaId: t.fluxo_tarefa_id,
        checklistProgresso: t.checklist_progresso,
      })
    }

    return items
  }, [novasTarefas, ocorrenciaMap, clienteMap, userMap])

  // Auto-seleciona tarefa quando ?tarefa= está na URL (ex.: clique no Pomodoro flutuante)
  const autoSelectDoneRef = useRef(false)
  useEffect(() => {
    const id = searchParams.get('tarefa')
    if (!id || todasUnificadas.length === 0 || autoSelectDoneRef.current) return
    const tarefa = todasUnificadas.find(t => t.tarefaId === id)
    if (tarefa) {
      setTarefaSelecionada(tarefa)
      autoSelectDoneRef.current = true
      setSearchParams({}, { replace: true })
    }
  }, [todasUnificadas, searchParams, setSearchParams])

  const tarefasFiltradas = useMemo<TarefaUnificada[]>(() => {
    let lista = todasUnificadas
    if (filtroCliente)    lista = lista.filter(t => t.clienteId === filtroCliente)
    if (filtroStatus)     lista = lista.filter(t => t.status === filtroStatus)
    if (filtroDataInicio) lista = lista.filter(t => t.dataPrevista >= filtroDataInicio)
    if (filtroDataFim)    lista = lista.filter(t => t.dataPrevista <= filtroDataFim)
    return lista
  }, [todasUnificadas, filtroCliente, filtroStatus, filtroDataInicio, filtroDataFim])

  const abertas = useMemo(() =>
    tarefasFiltradas.filter(t => t.status !== 'concluida' && t.status !== 'nao_se_aplica'),
    [tarefasFiltradas])

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
    tarefasFiltradas
      .filter(t => t.urgencia === 'critico' && t.status !== 'concluida' && t.status !== 'nao_se_aplica')
      .sort(sortByUrgencia),
    [tarefasFiltradas])

  const concluidas = useMemo(() => {
    const lista = tarefasFiltradas
      .filter(t => t.status === 'concluida' || t.status === 'nao_se_aplica')
    if (!isAdmin) {
      return lista.filter(t => t.responsavelId === currentUser?.id || t.responsavelId === '')
    }
    return lista.sort((a, b) =>
      (b.dataConclusao ?? b.dataPrevista).localeCompare(a.dataConclusao ?? a.dataPrevista)
    )
  }, [tarefasFiltradas, isAdmin, currentUser])

  const equipeTarefas = useMemo(() =>
    [...abertas].sort(sortByUrgencia),
    [abertas])

  function handleIniciar(t: TarefaUnificada) {
    updateTarefaNova.mutate(
      { id: t.tarefaId, data: { status: 'em_andamento' } },
      {
        onSuccess: () => {
          toast({ title: 'Tarefa iniciada' })
          registrarHistorico.mutate({
            tenantId,
            tarefaId: t.tarefaId,
            tarefaTipo: 'tarefa',
            tipo: 'status_alterado',
            autorId: currentUser?.id,
            autorNome: currentUser?.nome,
            meta: { status_anterior: 'pendente', status_novo: 'em_andamento' },
          })
        },
      }
    )
  }

  function handleConcluir(t: TarefaUnificada) {
    concluirTarefa.mutate(
      { tarefaId: t.tarefaId, ocorrenciaId: t.ocorrenciaId },
      { onSuccess: () => toast({ title: 'Tarefa concluída' }) }
    )
  }

  function handleSalvarDialog(
    t: TarefaUnificada,
    status: TarefaStatus,
    responsavelId: string,
    observacoes: string,
    impDesc?: string,
    impResp?: string,
  ) {
    const hoje = format(new Date(), 'yyyy-MM-dd')
    updateTarefaNova.mutate(
      {
        id: t.tarefaId,
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
          toast({ title: 'Tarefa atualizada' })
          setTarefaSelecionada(null)
        },
      }
    )
  }

  function handleConcluirDialog(t: TarefaUnificada) {
    concluirTarefa.mutate(
      { tarefaId: t.tarefaId, ocorrenciaId: t.ocorrenciaId },
      {
        onSuccess: () => {
          toast({ title: 'Tarefa concluída' })
          setTarefaSelecionada(null)
        },
      }
    )
  }

  const isSaving = updateTarefaNova.isPending || concluirTarefa.isPending

  function renderCards(tarefas: TarefaUnificada[]) {
    return tarefas.map(t => (
      <TarefaCard
        key={t.id}
        t={t}
        isSelected={tarefaSelecionada?.id === t.id}
        onAbrir={setTarefaSelecionada}
        onIniciar={handleIniciar}
        onConcluir={handleConcluir}
      />
    ))
  }

  return (
    /*
     * Desktop: container ocupa exatamente a área de conteúdo do main
     * (100vh - header 3.5rem - padding top 1.5rem - padding bottom 1.5rem = 6.5rem)
     * evitando o scrollbar do main. Cada coluna controla seu próprio scroll.
     */
    <div className="lg:flex lg:gap-4 lg:h-[calc(100vh-6.5rem)] lg:overflow-hidden">

      {/* Coluna esquerda: flex-col, header fixo, só cards rolam */}
      <div className="flex-1 min-w-0 lg:flex lg:flex-col lg:overflow-hidden">

        {/* Header fixo: título + chips */}
        <div className="shrink-0 mb-2 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tarefas</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-muted-foreground text-sm">Rotinas e ocorrências em um só lugar</p>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
                  <Inbox className="h-3 w-3" />
                  {abertas.length} abertas
                </span>
                {atrasadas.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5">
                    <AlertTriangle className="h-3 w-3" />
                    {atrasadas.length} atrasadas
                  </span>
                )}
                <span className="text-xs text-muted-foreground/70">
                  {todasUnificadas.length} total
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <Button
              variant={filtrosAtivos ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltrosOpen(o => !o)}
              className="gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros
              {filtrosAtivos && (
                <span className="ml-0.5 bg-white/25 text-[10px] font-bold rounded-full px-1.5 py-px leading-none">
                  {[filtroCliente, filtroStatus, filtroDataInicio || filtroDataFim].filter(Boolean).length}
                </span>
              )}
            </Button>
            {currentUser?.papel !== 'cliente' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNovaOcorrenciaOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova Ocorrência
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCatalogoOpen(true)}
                  className="gap-1.5"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Painel de Rotinas
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Barra de filtros */}
        {filtrosOpen && (
          <div className="shrink-0 mb-2 p-3 bg-accent/30 rounded-lg border flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-[200px] flex-1">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <ClienteCombobox
                clientes={clientes}
                value={filtroCliente}
                onChange={setFiltroCliente}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Data prevista â€” de</Label>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={e => setFiltroDataInicio(e.target.value)}
                className="h-8 text-sm w-[150px]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">até</Label>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={e => setFiltroDataFim(e.target.value)}
                className="h-8 text-sm w-[150px]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filtroStatus} onValueChange={v => setFiltroStatus(v as TarefaStatus | '')}>
                <SelectTrigger className="h-8 text-sm w-[160px]">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtrosAtivos && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground"
                onClick={limparFiltros}
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </div>
        )}

        {/* Tabs: ocupa o restante da altura, TabsList fixo, conteúdo rola */}
        <Tabs defaultValue="meu-dia" className="lg:flex-1 lg:flex lg:flex-col lg:min-h-0">

          {/* TabsList â€” fixo, não rola */}
          <div className="overflow-x-auto shrink-0">
            <TabsList className="w-max">
              <TabsTrigger value="meu-dia" className="gap-1.5">
                Meu Dia
                {meiasTarefas.length > 0 && (
                  <span className="text-[10px] font-semibold bg-primary/15 text-primary rounded-full px-1.5 py-px leading-none">
                    {meiasTarefas.length}
                  </span>
                )}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="equipe" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Equipe
                  {equipeTarefas.length > 0 && (
                    <span className="text-[10px] font-semibold bg-primary/15 text-primary rounded-full px-1.5 py-px leading-none">
                      {equipeTarefas.length}
                    </span>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="atrasadas" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Atrasadas
                {atrasadas.length > 0 && (
                  <span className="text-[10px] font-semibold bg-red-600 text-white rounded-full px-1.5 py-px leading-none">
                    {atrasadas.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="concluidas" className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Concluídas
                {concluidas.length > 0 && (
                  <span className="text-[10px] font-semibold bg-green-600 text-white rounded-full px-1.5 py-px leading-none">
                    {concluidas.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Área scrollável â€” apenas os cards rolam */}
          <div className="mt-2 lg:flex-1 lg:overflow-y-auto lg:min-h-0 lg:pr-1">
            <TabsContent value="meu-dia" className="space-y-2 mt-0">
              {meiasTarefas.length === 0 ? (
                <ListaVazia msg="Nenhuma tarefa pendente para você" />
              ) : renderCards(meiasTarefas)}
            </TabsContent>

            {isAdmin && (
              <TabsContent value="equipe" className="space-y-2 mt-0">
                {equipeTarefas.length === 0 ? (
                  <ListaVazia msg="Nenhuma tarefa em aberto" />
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground pb-1">
                      {equipeTarefas.length} tarefa{equipeTarefas.length !== 1 ? 's' : ''} em aberto
                    </p>
                    <Separator />
                    {renderCards(equipeTarefas)}
                  </>
                )}
              </TabsContent>
            )}

            <TabsContent value="atrasadas" className="space-y-2 mt-0">
              {atrasadas.length === 0 ? (
                <ListaVazia msg="Nenhuma tarefa atrasada" />
              ) : renderCards(atrasadas)}
            </TabsContent>

            <TabsContent value="concluidas" className="space-y-2 mt-0">
              {concluidas.length === 0 ? (
                <ListaVazia msg="Nenhuma tarefa concluída ainda" />
              ) : (
                <>
                  <p className="text-xs text-muted-foreground pb-1">
                    {concluidas.length} tarefa{concluidas.length !== 1 ? 's' : ''} concluída{concluidas.length !== 1 ? 's' : ''}
                  </p>
                  <Separator />
                  {renderCards(concluidas)}
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Painel direito: altura total do container, footer sempre visível */}
      {tarefaSelecionada && (
        <div className="hidden lg:flex lg:flex-col lg:w-2/5 shrink-0 lg:h-full rounded-lg overflow-hidden border border-primary/40 ring-2 ring-primary/20 shadow-lg shadow-primary/10">
          <TarefaDetalheConteudo
            key={tarefaSelecionada.id}
            tarefa={tarefaSelecionada}
            colaboradores={colaboradores}
            onClose={() => setTarefaSelecionada(null)}
            onSalvar={handleSalvarDialog}
            onConcluir={handleConcluirDialog}
            onVerOrigem={handleVerOrigem}
            isSaving={isSaving}
          />
        </div>
      )}

      {/* Dialog mobile â€” só abre quando não for desktop */}
      {tarefaSelecionada && !isDesktop && (
        <TarefaDetalheDialog
          key={tarefaSelecionada.id}
          tarefa={tarefaSelecionada}
          colaboradores={colaboradores}
          onClose={() => setTarefaSelecionada(null)}
          onSalvar={handleSalvarDialog}
          onConcluir={handleConcluirDialog}
          onVerOrigem={handleVerOrigem}
          isSaving={isSaving}
        />
      )}

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
          initialEtapaId={painelRotina.initialEtapaId}
          initialClienteId={painelRotina.initialClienteId}
        />
      )}
      <NovaOcorrenciaDialog
        open={novaOcorrenciaOpen}
        onOpenChange={setNovaOcorrenciaOpen}
      />
      <OcorrenciaDetalheDialog
        ocorrencia={ocorrenciaDetalhe}
        open={!!ocorrenciaDetalhe}
        onOpenChange={(v) => { if (!v) setOcorrenciaDetalhe(null) }}
      />

      <div className="h-16 rounded-xl border border-dashed border-border/40 bg-muted/20" />
    </div>
  )
}
