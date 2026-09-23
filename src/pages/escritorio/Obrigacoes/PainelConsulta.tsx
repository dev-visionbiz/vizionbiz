import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { X, Filter, CheckSquare, ExternalLink, AlertTriangle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useObrigacoes } from '@/data/hooks/useObrigacoes'
import { useTodasCompetencias } from '@/data/hooks/useCompetencias'
import { useTodasEtapas } from '@/data/hooks/useEtapasObrigacao'
import { useTarefasTenant, useUpdateTarefa, useUpdateTarefasLote, useConcluirTarefas } from '@/data/hooks/useTarefasObrigacao'
import { useClients } from '@/data/hooks/useClients'
import { useUsers } from '@/data/hooks/useUsers'
import { cn, formatDate } from '@/lib/utils'
import type { TarefaObrigacao, TarefaStatus } from '@/domain/types'

const statusConfig: Record<TarefaStatus, { label: string; className: string }> = {
  pendente:      { label: 'Pendente',     className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento:  { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  concluida:     { label: 'Concluída',    className: 'bg-green-100 text-green-800 border-transparent' },
  atrasada:      { label: 'Atrasada',     className: 'bg-red-100 text-red-800 border-transparent' },
  nao_se_aplica: { label: 'N/A',          className: 'bg-gray-100 text-gray-500 border-transparent' },
  impedido:      { label: 'Impedida',     className: 'bg-orange-100 text-orange-800 border-transparent' },
}

function periodoLabel(periodo: string): string {
  try {
    const [ano, mes] = periodo.split('-').map(Number)
    return format(new Date(ano, mes - 1, 1), 'MMM/yyyy', { locale: ptBR })
  } catch { return periodo }
}

export function PainelConsulta() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const { data: todasTarefas = [] }     = useTarefasTenant(tenantId)
  const { data: obrigacoes = [] }       = useObrigacoes(tenantId)
  const { data: competencias = [] }     = useTodasCompetencias(tenantId)
  const { data: etapas = [] }           = useTodasEtapas(tenantId)
  const { data: clientes = [] }         = useClients(tenantId)
  const { data: users = [] }            = useUsers(tenantId)

  const updateLote      = useUpdateTarefasLote()
  const updateTarefa    = useUpdateTarefa()
  const concluirTarefas = useConcluirTarefas()

  const [tarefaDetalhe, setTarefaDetalhe] = useState<TarefaObrigacao | null>(null)
  const [detStatus,     setDetStatus]     = useState<TarefaStatus>('pendente')
  const [detResp,       setDetResp]       = useState('')
  const [detObs,        setDetObs]        = useState('')
  const [detImpDesc,    setDetImpDesc]    = useState('')
  const [detImpResp,    setDetImpResp]    = useState('')

  function abrirDetalhe(t: TarefaObrigacao) {
    setTarefaDetalhe(t)
    setDetStatus(t.status === 'atrasada' ? 'pendente' : t.status)
    setDetResp(t.responsavel ?? '')
    setDetObs(t.observacoes ?? '')
    setDetImpDesc(t.impedimento_descricao ?? '')
    setDetImpResp(t.impedimento_responsavel ?? '')
  }

  async function salvarDetalhe() {
    if (!tarefaDetalhe) return
    if (detStatus === 'impedido' && !detImpDesc.trim()) {
      toast({ title: 'Informe a descrição do impedimento', variant: 'destructive' })
      return
    }
    if (detStatus === 'impedido' && !detImpResp) {
      toast({ title: 'Atribua um responsável pela resolução', variant: 'destructive' })
      return
    }
    const hoje = format(new Date(), 'yyyy-MM-dd')
    await updateTarefa.mutateAsync({
      id: tarefaDetalhe.id,
      data: {
        status: detStatus,
        responsavel: detResp || undefined,
        observacoes: detObs || undefined,
        data_conclusao: detStatus === 'concluida' ? (tarefaDetalhe.data_conclusao ?? hoje) : undefined,
        ...(detStatus === 'impedido' ? {
          impedimento_descricao: detImpDesc.trim(),
          impedimento_responsavel: detImpResp,
          impedimento_data: tarefaDetalhe.impedimento_data ?? hoje,
        } : {}),
      },
    })
    toast({ title: 'Tarefa atualizada' })
    setTarefaDetalhe(null)
  }

  const [filtroObrigacao,   setFiltroObrigacao]   = useState('')
  const [filtroCompetencia, setFiltroCompetencia] = useState('')
  const [filtroEtapa,       setFiltroEtapa]       = useState('')
  const [filtroCliente,     setFiltroCliente]     = useState(() => searchParams.get('cliente') ?? '')
  const [filtroStatus,      setFiltroStatus]      = useState<TarefaStatus | ''>('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [filtroDe,          setFiltroDe]          = useState('')
  const [filtroAte,         setFiltroAte]         = useState('')

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [obsDialog, setObsDialog]       = useState(false)
  const [obsText, setObsText]           = useState('')
  const [respDialog, setRespDialog]     = useState(false)
  const [respId, setRespId]             = useState('')

  // mobile filter sheet
  const [filtroSheetOpen, setFiltroSheetOpen] = useState(false)

  const competenciaMap = useMemo(() => new Map(competencias.map((c) => [c.id, c])), [competencias])
  const etapaMap       = useMemo(() => new Map(etapas.map((e) => [e.id, e])),       [etapas])
  const obrigacaoMap   = useMemo(() => new Map(obrigacoes.map((o) => [o.id, o])),   [obrigacoes])
  const clienteMap     = useMemo(() => new Map(clientes.map((c) => [c.id, c])),     [clientes])
  const userMap        = useMemo(() => new Map(users.map((u) => [u.id, u])),        [users])

  const escritorioUsers = users.filter((u) => u.papel !== 'cliente' && u.ativo)

  const competenciasDisponiveis = useMemo(() =>
    filtroObrigacao
      ? competencias.filter((c) => c.obrigacao_id === filtroObrigacao)
      : competencias,
    [competencias, filtroObrigacao]
  )
  const etapasDisponiveis = useMemo(() =>
    filtroObrigacao
      ? etapas.filter((e) => e.obrigacao_id === filtroObrigacao)
      : etapas,
    [etapas, filtroObrigacao]
  )

  const resultado = useMemo(() => {
    let r = todasTarefas

    if (filtroObrigacao) {
      const compIds = new Set(
        competencias.filter((c) => c.obrigacao_id === filtroObrigacao).map((c) => c.id)
      )
      r = r.filter((t) => compIds.has(t.competencia_id))
    }
    if (filtroCompetencia) r = r.filter((t) => t.competencia_id === filtroCompetencia)
    if (filtroEtapa)       r = r.filter((t) => t.etapa_id       === filtroEtapa)
    if (filtroCliente)     r = r.filter((t) => t.cliente_id     === filtroCliente)
    if (filtroStatus)      r = r.filter((t) => t.status         === filtroStatus)
    if (filtroResponsavel === '_sem') {
      r = r.filter((t) => !t.responsavel)
    } else if (filtroResponsavel) {
      r = r.filter((t) => t.responsavel === filtroResponsavel)
    }
    if (filtroDe)  r = r.filter((t) => t.data_prevista >= filtroDe)
    if (filtroAte) r = r.filter((t) => t.data_prevista <= filtroAte)

    return r.sort((a, b) => a.data_prevista.localeCompare(b.data_prevista))
  }, [
    todasTarefas, filtroObrigacao, filtroCompetencia, filtroEtapa,
    filtroCliente, filtroStatus, filtroResponsavel, filtroDe, filtroAte, competencias,
  ])

  const resumo = useMemo(() => ({
    total:        resultado.length,
    pendentes:    resultado.filter((t) => t.status === 'pendente').length,
    atrasadas:    resultado.filter((t) => t.status === 'atrasada').length,
    em_andamento: resultado.filter((t) => t.status === 'em_andamento').length,
    concluidas:   resultado.filter((t) => t.status === 'concluida').length,
    impedidas:    resultado.filter((t) => t.status === 'impedido').length,
    nao_aplica:   resultado.filter((t) => t.status === 'nao_se_aplica').length,
  }), [resultado])

  // counts before status filter (for pills to always show global counts)
  const contagens = useMemo(() => {
    let r = todasTarefas
    if (filtroObrigacao) {
      const compIds = new Set(competencias.filter((c) => c.obrigacao_id === filtroObrigacao).map((c) => c.id))
      r = r.filter((t) => compIds.has(t.competencia_id))
    }
    if (filtroCompetencia) r = r.filter((t) => t.competencia_id === filtroCompetencia)
    if (filtroEtapa)       r = r.filter((t) => t.etapa_id       === filtroEtapa)
    if (filtroCliente)     r = r.filter((t) => t.cliente_id     === filtroCliente)
    if (filtroResponsavel === '_sem') r = r.filter((t) => !t.responsavel)
    else if (filtroResponsavel)       r = r.filter((t) => t.responsavel === filtroResponsavel)
    if (filtroDe)  r = r.filter((t) => t.data_prevista >= filtroDe)
    if (filtroAte) r = r.filter((t) => t.data_prevista <= filtroAte)
    return {
      total:        r.length,
      pendentes:    r.filter((t) => t.status === 'pendente').length,
      atrasadas:    r.filter((t) => t.status === 'atrasada').length,
      em_andamento: r.filter((t) => t.status === 'em_andamento').length,
      concluidas:   r.filter((t) => t.status === 'concluida').length,
      impedidas:    r.filter((t) => t.status === 'impedido').length,
      nao_aplica:   r.filter((t) => t.status === 'nao_se_aplica').length,
    }
  }, [todasTarefas, filtroObrigacao, filtroCompetencia, filtroEtapa, filtroCliente, filtroResponsavel, filtroDe, filtroAte, competencias])

  // pills only shown when count > 0 (except Todas)
  const statusPills: { value: TarefaStatus | ''; label: string; count: number; alertCls?: string }[] = [
    { value: '',              label: 'Todas',        count: contagens.total },
    { value: 'atrasada',      label: 'Atrasadas',    count: contagens.atrasadas,    alertCls: contagens.atrasadas > 0  ? 'border-red-400 text-red-700'    : undefined },
    { value: 'impedido',      label: 'Impedidas',    count: contagens.impedidas,    alertCls: contagens.impedidas > 0  ? 'border-orange-400 text-orange-700' : undefined },
    { value: 'pendente',      label: 'Pendentes',    count: contagens.pendentes },
    { value: 'em_andamento',  label: 'Em Andamento', count: contagens.em_andamento },
    { value: 'concluida',     label: 'Concluídas',   count: contagens.concluidas },
    { value: 'nao_se_aplica', label: 'N/A',          count: contagens.nao_aplica },
  ].filter(p => p.value === '' || p.count > 0) as { value: TarefaStatus | ''; label: string; count: number; alertCls?: string }[]

  // count of active non-status filters (for badge on mobile Filtros button)
  const filtrosAvancadosAtivos = [
    filtroObrigacao, filtroCompetencia, filtroEtapa,
    filtroCliente, filtroResponsavel, filtroDe, filtroAte,
  ].filter(Boolean).length

  const temFiltro = !!(filtroObrigacao || filtroCompetencia || filtroEtapa || filtroCliente
    || filtroStatus || filtroResponsavel || filtroDe || filtroAte)

  function limparFiltros() {
    setFiltroObrigacao('')
    setFiltroCompetencia('')
    setFiltroEtapa('')
    setFiltroCliente('')
    setFiltroStatus('')
    setFiltroResponsavel('')
    setFiltroDe('')
    setFiltroAte('')
    setSelecionados(new Set())
  }

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleTodos() {
    if (selecionados.size === resultado.length) setSelecionados(new Set())
    else setSelecionados(new Set(resultado.map((t) => t.id)))
  }

  async function handleConcluir() {
    await concluirTarefas.mutateAsync(Array.from(selecionados))
    toast({ title: `${selecionados.size} tarefa${selecionados.size !== 1 ? 's' : ''} concluída${selecionados.size !== 1 ? 's' : ''}` })
    setSelecionados(new Set())
  }

  async function handleEmAndamento() {
    await updateLote.mutateAsync({ ids: Array.from(selecionados), data: { status: 'em_andamento' as TarefaStatus, data_conclusao: undefined } })
    setSelecionados(new Set())
  }

  async function handleSalvarObs() {
    await updateLote.mutateAsync({ ids: Array.from(selecionados), data: { observacoes: obsText } })
    setSelecionados(new Set())
    setObsDialog(false)
    setObsText('')
  }

  async function handleSalvarResp() {
    await updateLote.mutateAsync({ ids: Array.from(selecionados), data: { responsavel: respId || undefined } })
    setSelecionados(new Set())
    setRespDialog(false)
    setRespId('')
  }

  const algumSelecionado = selecionados.size > 0
  const todosSelec = resultado.length > 0 && selecionados.size === resultado.length

  return (
    <div className="px-4 sm:px-6 pb-8 space-y-4">

      {/* ── MOBILE: sticky bar — 1 linha: botão Filtros + pills ── */}
      <div className="md:hidden sticky top-0 z-10 -mx-4 px-3 bg-background/95 backdrop-blur-sm border-b py-2">
        <div className="flex items-center gap-2 overflow-hidden">

          {/* botão Filtros fixo à esquerda */}
          <button
            onClick={() => setFiltroSheetOpen(true)}
            className={cn(
              'shrink-0 relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
              filtrosAvancadosAtivos > 0
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-border'
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {filtrosAvancadosAtivos > 0 && (
              <span className="ml-0.5 font-bold">{filtrosAvancadosAtivos}</span>
            )}
          </button>

          {/* separador visual */}
          <span className="shrink-0 w-px h-5 bg-border" />

          {/* pills de status — scroll horizontal */}
          <div className="flex gap-2 overflow-x-auto flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {statusPills.map(({ value, label, count, alertCls }) => {
              const isActive = filtroStatus === value
              return (
                <button
                  key={String(value) || 'todas'}
                  onClick={() => setFiltroStatus(isActive && value !== '' ? '' : value)}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-foreground text-background border-foreground'
                      : alertCls
                        ? cn('bg-background border-2', alertCls)
                        : 'bg-background text-foreground border-border active:bg-muted'
                  )}
                >
                  {label} <span className={cn('font-bold', isActive ? 'text-background/80' : '')}>{count}</span>
                </button>
              )
            })}

            {/* Limpar como última pill quando há filtros ativos */}
            {temFiltro && (
              <button
                onClick={limparFiltros}
                className="shrink-0 inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap active:bg-muted"
              >
                <X className="h-3 w-3" /> Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── DESKTOP: painel de filtros ── */}
      <div className="hidden md:block rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </div>
          {temFiltro && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={limparFiltros}>
              <X className="h-3 w-3" /> Limpar filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Obrigação</Label>
            <Select value={filtroObrigacao || '_todas'} onValueChange={(v) => { const val = v === '_todas' ? '' : v; setFiltroObrigacao(val); setFiltroCompetencia(''); setFiltroEtapa('') }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_todas">Todas as obrigações</SelectItem>
                {obrigacoes.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Competência</Label>
            <Select value={filtroCompetencia || '_todas'} onValueChange={(v) => setFiltroCompetencia(v === '_todas' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_todas">Todas as competências</SelectItem>
                {competenciasDisponiveis.map((c) => <SelectItem key={c.id} value={c.id}>{periodoLabel(c.periodo)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Etapa</Label>
            <Select value={filtroEtapa || '_todas'} onValueChange={(v) => setFiltroEtapa(v === '_todas' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_todas">Todas as etapas</SelectItem>
                {etapasDisponiveis.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Cliente</Label>
            <Select value={filtroCliente || '_todos'} onValueChange={(v) => setFiltroCliente(v === '_todos' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_todos">Todos os clientes</SelectItem>
                {clientes.filter((c) => c.status === 'ativo').sort((a, b) => a.razao_social.localeCompare(b.razao_social)).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={filtroStatus || '_todos'} onValueChange={(v) => setFiltroStatus(v === '_todos' ? '' : v as TarefaStatus)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_todos">Todos os status</SelectItem>
                {(Object.keys(statusConfig) as TarefaStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Responsável</Label>
            <Select value={filtroResponsavel || '_todos'} onValueChange={(v) => setFiltroResponsavel(v === '_todos' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_todos">Todos</SelectItem>
                <SelectItem value="_sem">Sem responsável</SelectItem>
                {escritorioUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Data prevista — de</Label>
            <Input type="date" value={filtroDe} onChange={(e) => setFiltroDe(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">até</Label>
            <Input type="date" value={filtroAte} onChange={(e) => setFiltroAte(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex gap-1 col-span-2 self-end pb-0.5">
            {[
              { label: 'Esta semana', fn: () => {
                const hoje = new Date()
                const dom = new Date(hoje); dom.setDate(hoje.getDate() - hoje.getDay())
                const sab = new Date(dom); sab.setDate(dom.getDate() + 6)
                setFiltroDe(format(dom, 'yyyy-MM-dd'))
                setFiltroAte(format(sab, 'yyyy-MM-dd'))
              }},
              { label: 'Este mês', fn: () => {
                const hoje = new Date()
                setFiltroDe(format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd'))
                setFiltroAte(format(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0), 'yyyy-MM-dd'))
              }},
              { label: 'Em aberto', fn: () => {
                setFiltroStatus('pendente' as TarefaStatus)
                setFiltroDe('')
                setFiltroAte('')
              }},
            ].map(({ label, fn }) => (
              <Button key={label} variant="outline" size="sm" className="h-8 text-xs px-2.5" onClick={fn}>{label}</Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DESKTOP: cards de resumo ── */}
      <div className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Total',        value: resumo.total,        cls: 'text-foreground',   cardCls: '' },
          { label: 'Pendentes',    value: resumo.pendentes,    cls: 'text-blue-700',      cardCls: '' },
          { label: 'Atrasadas',    value: resumo.atrasadas,    cls: resumo.atrasadas > 0 ? 'text-red-600 font-bold' : 'text-muted-foreground', cardCls: '' },
          { label: 'Em andamento', value: resumo.em_andamento, cls: 'text-yellow-700',    cardCls: '' },
          { label: 'Concluídas',   value: resumo.concluidas,   cls: 'text-green-700',     cardCls: '' },
          { label: 'Impedidas',    value: resumo.impedidas,    cls: resumo.impedidas > 0 ? 'text-orange-600 font-bold' : 'text-muted-foreground', cardCls: resumo.impedidas > 0 ? 'border-orange-300 bg-orange-50' : '' },
        ].map(({ label, value, cls, cardCls }) => (
          <div key={label} className={`rounded-lg border bg-card px-3 py-2.5 text-center ${cardCls}`}>
            {label === 'Impedidas' && resumo.impedidas > 0
              ? <p className={`text-xl font-bold flex items-center justify-center gap-1 ${cls}`}><AlertTriangle className="h-4 w-4" />{value}</p>
              : <p className={`text-xl font-bold ${cls}`}>{value}</p>
            }
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Barra de ações em massa ── */}
      {algumSelecionado && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-md bg-muted/60 border">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium mr-1">
            {selecionados.size} selecionada{selecionados.size !== 1 ? 's' : ''}
          </span>
          <Button size="sm" onClick={handleConcluir} disabled={concluirTarefas.isPending}>Concluir</Button>
          <Button size="sm" variant="outline" onClick={handleEmAndamento} disabled={updateLote.isPending}>Em andamento</Button>
          <Button size="sm" variant="outline" onClick={() => setRespDialog(true)}>Reatribuir</Button>
          <Button size="sm" variant="outline" onClick={() => setObsDialog(true)}>Observação</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelecionados(new Set())}>Cancelar</Button>
        </div>
      )}

      {/* ── Lista de tarefas — desktop: tabela com borda única; mobile: cards individuais ── */}

      {/* Desktop */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[2rem_2fr_7rem_7rem_2fr_8rem_8rem_1fr] gap-x-3 px-4 py-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground min-w-208">
            <Checkbox checked={todosSelec} onCheckedChange={toggleTodos} aria-label="Selecionar todos" />
            <span>Cliente</span><span>Obrigação</span><span>Competência</span>
            <span>Etapa</span><span>Data prevista</span><span>Status</span>
            <span>Responsável / Obs.</span>
          </div>
          {resultado.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground">
              {temFiltro ? 'Nenhuma tarefa corresponde aos filtros aplicados.' : 'Nenhuma tarefa cadastrada ainda.'}
            </div>
          ) : (
            <div className="divide-y">
              {resultado.map((tarefa) => {
                const cliente     = clienteMap.get(tarefa.cliente_id)
                const comp        = competenciaMap.get(tarefa.competencia_id)
                const etapa       = etapaMap.get(tarefa.etapa_id)
                const obrigacao   = comp ? obrigacaoMap.get(comp.obrigacao_id) : undefined
                const responsavel = tarefa.responsavel ? userMap.get(tarefa.responsavel) : null
                const sel         = selecionados.has(tarefa.id)
                const sc          = statusConfig[tarefa.status]
                return (
                  <div key={tarefa.id} className={`hover:bg-muted/30 transition-colors ${tarefa.status === 'impedido' ? 'bg-orange-50/60' : ''}`}>
                    <div className="grid grid-cols-[2rem_2fr_7rem_7rem_2fr_8rem_8rem_1fr] gap-x-3 px-4 py-3 items-start min-w-208">
                      <Checkbox checked={sel} onCheckedChange={() => toggleSelecionado(tarefa.id)} onClick={(e) => e.stopPropagation()} className="mt-0.5" />
                      <div className="min-w-0 cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                        <p className="text-sm font-medium leading-snug">{cliente?.razao_social ?? tarefa.cliente_id}</p>
                        {cliente?.fantasia && <p className="text-xs text-muted-foreground leading-snug">{cliente.fantasia}</p>}
                      </div>
                      <div className="min-w-0 cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                        <p className="text-xs text-muted-foreground leading-snug">{obrigacao?.nome ?? '—'}</p>
                      </div>
                      <span className="text-xs text-muted-foreground cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                        {comp ? periodoLabel(comp.periodo) : '—'}
                      </span>
                      <div className="min-w-0 cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                        <p className="text-sm leading-snug">{etapa?.nome ?? '—'}</p>
                        {etapa?.descricao && <p className="text-xs text-muted-foreground/70 leading-snug mt-0.5">{etapa.descricao}</p>}
                      </div>
                      <span className="text-sm text-muted-foreground cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                        {formatDate(tarefa.data_prevista)}
                      </span>
                      <div className="cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                        <div className="flex items-center gap-1">
                          {tarefa.status === 'impedido' && <AlertTriangle className="h-3.5 w-3.5 text-orange-600 shrink-0" />}
                          <Badge className={`text-xs w-fit ${sc.className}`}>{sc.label}</Badge>
                        </div>
                      </div>
                      <div className="min-w-0 cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                        {tarefa.status === 'impedido' && tarefa.impedimento_descricao ? (
                          <>
                            <p className="text-xs text-orange-700 font-medium leading-snug">{userMap.get(tarefa.impedimento_responsavel ?? '')?.nome ?? '—'}</p>
                            <p className="text-xs text-orange-600/80 mt-0.5 leading-snug line-clamp-1">{tarefa.impedimento_descricao}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">{responsavel?.nome ?? '—'}</p>
                            {tarefa.observacoes && <p className="text-xs text-muted-foreground/70 mt-0.5">{tarefa.observacoes}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile — cards individuais */}
      <div className="md:hidden space-y-2">
        {resultado.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            {temFiltro ? 'Nenhuma tarefa corresponde aos filtros aplicados.' : 'Nenhuma tarefa cadastrada ainda.'}
          </div>
        ) : resultado.map((tarefa) => {
          const cliente     = clienteMap.get(tarefa.cliente_id)
          const comp        = competenciaMap.get(tarefa.competencia_id)
          const etapa       = etapaMap.get(tarefa.etapa_id)
          const obrigacao   = comp ? obrigacaoMap.get(comp.obrigacao_id) : undefined
          const responsavel = tarefa.responsavel ? userMap.get(tarefa.responsavel) : null
          const sel         = selecionados.has(tarefa.id)
          const sc          = statusConfig[tarefa.status]

          // linha de detalhe: Obrigação · Período · Etapa · Obs / Impedimento
          const detalhe = [
            obrigacao?.nome,
            comp ? periodoLabel(comp.periodo) : null,
            etapa?.nome,
            tarefa.status === 'impedido' && tarefa.impedimento_descricao
              ? tarefa.impedimento_descricao
              : tarefa.observacoes,
          ].filter(Boolean).join(' · ')

          return (
            <div
              key={tarefa.id}
              onClick={() => abrirDetalhe(tarefa)}
              className={cn(
                'rounded-xl border bg-card px-4 py-3.5 flex items-start gap-3 active:bg-muted/40 transition-colors',
                tarefa.status === 'impedido' ? 'border-orange-200 bg-orange-50/40' : ''
              )}
            >
              <Checkbox
                checked={sel}
                onCheckedChange={() => toggleSelecionado(tarefa.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* linha 1: nome do cliente + badge de status + link */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug flex-1 min-w-0">
                    {cliente?.razao_social ?? tarefa.cliente_id}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {tarefa.status === 'impedido' && <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />}
                    <Badge className={`text-xs font-bold uppercase tracking-wide ${sc.className}`}>{sc.label}</Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 ml-0.5" />
                  </div>
                </div>

                {/* linha 2: obrigação · período · etapa · obs */}
                {detalhe && (
                  <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{detalhe}</p>
                )}

                {/* linha 3: data com ícone + responsável */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {formatDate(tarefa.data_prevista)}
                  </span>
                  {tarefa.status === 'impedido' && tarefa.impedimento_responsavel
                    ? <span className="text-orange-700 font-medium">{userMap.get(tarefa.impedimento_responsavel)?.nome}</span>
                    : responsavel && <span>{responsavel.nome}</span>
                  }
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── MOBILE: bottom sheet de filtros ── */}
      {filtroSheetOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setFiltroSheetOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl border-t max-h-[90vh] flex flex-col md:hidden">
            {/* handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
            </div>
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <h3 className="font-semibold text-sm">Filtros avançados</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFiltroSheetOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* campos */}
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Obrigação</Label>
                <Select value={filtroObrigacao || '_todas'} onValueChange={(v) => { const val = v === '_todas' ? '' : v; setFiltroObrigacao(val); setFiltroCompetencia(''); setFiltroEtapa('') }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas as obrigações" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todas">Todas as obrigações</SelectItem>
                    {obrigacoes.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Competência</Label>
                <Select value={filtroCompetencia || '_todas'} onValueChange={(v) => setFiltroCompetencia(v === '_todas' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas as competências" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todas">Todas as competências</SelectItem>
                    {competenciasDisponiveis.map((c) => <SelectItem key={c.id} value={c.id}>{periodoLabel(c.periodo)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Etapa</Label>
                <Select value={filtroEtapa || '_todas'} onValueChange={(v) => setFiltroEtapa(v === '_todas' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas as etapas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todas">Todas as etapas</SelectItem>
                    {etapasDisponiveis.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cliente</Label>
                <Select value={filtroCliente || '_todos'} onValueChange={(v) => setFiltroCliente(v === '_todos' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todos">Todos os clientes</SelectItem>
                    {clientes.filter((c) => c.status === 'ativo').sort((a, b) => a.razao_social.localeCompare(b.razao_social)).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Responsável</Label>
                <Select value={filtroResponsavel || '_todos'} onValueChange={(v) => setFiltroResponsavel(v === '_todos' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todos">Todos</SelectItem>
                    <SelectItem value="_sem">Sem responsável</SelectItem>
                    {escritorioUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Data prevista — de</Label>
                  <Input type="date" value={filtroDe} onChange={(e) => setFiltroDe(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">até</Label>
                  <Input type="date" value={filtroAte} onChange={(e) => setFiltroAte(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'Esta semana', fn: () => {
                    const hoje = new Date()
                    const dom = new Date(hoje); dom.setDate(hoje.getDate() - hoje.getDay())
                    const sab = new Date(dom); sab.setDate(dom.getDate() + 6)
                    setFiltroDe(format(dom, 'yyyy-MM-dd'))
                    setFiltroAte(format(sab, 'yyyy-MM-dd'))
                  }},
                  { label: 'Este mês', fn: () => {
                    const hoje = new Date()
                    setFiltroDe(format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd'))
                    setFiltroAte(format(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0), 'yyyy-MM-dd'))
                  }},
                ].map(({ label, fn }) => (
                  <Button key={label} variant="outline" size="sm" className="flex-1 text-xs" onClick={fn}>{label}</Button>
                ))}
              </div>
            </div>
            {/* footer */}
            <div className="shrink-0 border-t bg-background px-4 py-3 flex gap-2">
              {filtrosAvancadosAtivos > 0 && (
                <Button variant="outline" className="flex-1 text-sm" onClick={() => { limparFiltros(); setFiltroSheetOpen(false) }}>
                  Limpar
                </Button>
              )}
              <Button className="flex-1 text-sm" onClick={() => setFiltroSheetOpen(false)}>
                Ver {resultado.length} resultado{resultado.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Dialog: observação */}
      <Dialog open={obsDialog} onOpenChange={setObsDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adicionar observação</DialogTitle></DialogHeader>
          <div className="py-2 space-y-1">
            <Label>Observação</Label>
            <Input value={obsText} onChange={(e) => setObsText(e.target.value)} placeholder="Texto da observação..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObsDialog(false)}>Cancelar</Button>
            <Button onClick={handleSalvarObs} disabled={updateLote.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: responsável */}
      <Dialog open={respDialog} onOpenChange={setRespDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reatribuir responsável</DialogTitle></DialogHeader>
          <div className="py-2 space-y-1">
            <Label>Responsável</Label>
            <Select value={respId || '_none'} onValueChange={(v) => setRespId(v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sem responsável</SelectItem>
                {escritorioUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespDialog(false)}>Cancelar</Button>
            <Button onClick={handleSalvarResp} disabled={updateLote.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: detalhe da tarefa */}
      {tarefaDetalhe && (() => {
        const det         = tarefaDetalhe
        const detCliente  = clienteMap.get(det.cliente_id)
        const detComp     = competenciaMap.get(det.competencia_id)
        const detEtapa    = etapaMap.get(det.etapa_id)
        const detObrig    = detComp ? obrigacaoMap.get(detComp.obrigacao_id) : undefined
        const detSc       = statusConfig[det.status]
        return (
          <Dialog open onOpenChange={(open) => { if (!open) setTarefaDetalhe(null) }}>
            <DialogContent className="sm:max-w-lg flex flex-col gap-0 p-0 max-h-[90vh] overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
                <DialogTitle className="leading-snug">{detCliente?.razao_social ?? det.cliente_id}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {detObrig?.nome}{detComp ? ` · ${periodoLabel(detComp.periodo)}` : ''}
                </p>
              </DialogHeader>

              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Etapa</p>
                    <p className="font-medium">{detEtapa?.nome ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status atual</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {det.status === 'impedido' && <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />}
                      <Badge className={`text-xs ${detSc.className}`}>{detSc.label}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data prevista</p>
                    <p>{formatDate(det.data_prevista)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data conclusão</p>
                    <p>{det.data_conclusao ? formatDate(det.data_conclusao) : '—'}</p>
                  </div>
                  {detEtapa?.descricao && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Instruções / informativo</p>
                      <p className="whitespace-pre-wrap text-sm">{detEtapa.descricao}</p>
                    </div>
                  )}
                  {det.status === 'impedido' && (det.impedimento_descricao || det.impedimento_responsavel) && (
                    <div className="col-span-2 rounded-md bg-orange-50 border border-orange-200 p-3 space-y-1">
                      <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Impedimento registrado
                        {det.impedimento_data && <span className="font-normal text-orange-600 ml-1">em {formatDate(det.impedimento_data)}</span>}
                      </p>
                      {det.impedimento_descricao && <p className="text-xs text-orange-700 whitespace-pre-wrap">{det.impedimento_descricao}</p>}
                      {det.impedimento_responsavel && (
                        <p className="text-xs text-orange-700">
                          Responsável: <span className="font-medium">{userMap.get(det.impedimento_responsavel)?.nome ?? det.impedimento_responsavel}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Alterar status</Label>
                    <Select value={detStatus} onValueChange={(v) => setDetStatus(v as TarefaStatus)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['pendente', 'em_andamento', 'concluida', 'nao_se_aplica', 'impedido'] as TarefaStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Responsável</Label>
                    <Select value={detResp || '_none'} onValueChange={(v) => setDetResp(v === '_none' ? '' : v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sem responsável</SelectItem>
                        {escritorioUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Observações</Label>
                    <Textarea value={detObs} onChange={(e) => setDetObs(e.target.value)} placeholder="Anotações sobre esta tarefa..." rows={3} className="text-sm resize-none" />
                  </div>
                  {detStatus === 'impedido' && (
                    <div className="rounded-md border border-orange-200 bg-orange-50/60 p-3 space-y-3">
                      <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Registrar impedimento
                      </p>
                      <div className="space-y-1">
                        <Label className="text-xs">Descrição do problema <span className="text-destructive">*</span></Label>
                        <Textarea value={detImpDesc} onChange={(e) => setDetImpDesc(e.target.value)} placeholder="Descreva o que está impedindo a conclusão desta etapa..." rows={3} className="text-sm resize-none bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Responsável pela resolução <span className="text-destructive">*</span></Label>
                        <Select value={detImpResp || '_none'} onValueChange={(v) => setDetImpResp(v === '_none' ? '' : v)}>
                          <SelectTrigger className="h-8 text-sm bg-white"><SelectValue placeholder="Selecionar responsável" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Selecionar responsável</SelectItem>
                            {escritorioUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t shrink-0">
                <Button variant="outline" onClick={() => setTarefaDetalhe(null)}>Cancelar</Button>
                <Button onClick={salvarDetalhe} disabled={updateTarefa.isPending}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}
