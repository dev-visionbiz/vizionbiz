import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown,
  Settings2, FileCheck2, Eye, PencilLine, SendHorizonal, RefreshCw, MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useObrigacaoConfigs, useObrigacaoLancamentosByCompetencia } from '@/data/hooks/useObrigacoes'
import { formatCurrency } from '@/lib/utils'
import type { ObrigacaoStatus, ObrigacaoConfig, ObrigacaoLancamento, Client } from '@/domain/types'
import { LancamentoModal } from './LancamentoModal'
import { DasModal } from './DasModal'

type Row = {
  config: ObrigacaoConfig
  lancamento: ObrigacaoLancamento | null
  cliente: Client | undefined
  statusDisplay: ObrigacaoStatus
}

type SortColumn = 'empresa' | 'faturamento' | 'status' | 'data_entrega' | 'vencimento'
type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<ObrigacaoStatus, number> = {
  pendente: 0, gerar: 1, aberto: 2, recalcular: 3, transmitido: 4,
}

const STATUS_CONFIG: Record<ObrigacaoStatus, { label: string }> = {
  pendente:    { label: 'Pendente' },
  gerar:       { label: 'Gerar' },
  aberto:      { label: 'Aberto' },
  recalcular:  { label: 'Recalcular' },
  transmitido: { label: 'Transmitido' },
}

function SortIcon({ col, sortColumn, sortDir }: {
  col: SortColumn; sortColumn: SortColumn | null; sortDir: SortDir
}) {
  if (sortColumn !== col) return <ChevronsUpDown className="w-3 h-3 shrink-0 text-muted-foreground/40" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 shrink-0 text-primary" />
    : <ChevronDown className="w-3 h-3 shrink-0 text-primary" />
}

function StatusBadge({ status }: { status: ObrigacaoStatus }) {
  const colorClass =
    status === 'pendente'    ? 'bg-gray-100 text-gray-700 border-gray-200' :
    status === 'gerar'       ? 'bg-blue-100 text-blue-700 border-blue-200' :
    status === 'aberto'      ? 'bg-amber-100 text-amber-700 border-amber-200' :
    status === 'recalcular'  ? 'bg-orange-100 text-orange-700 border-orange-200' :
    'bg-green-100 text-green-700 border-green-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
      {STATUS_CONFIG[status].label}
    </span>
  )
}

function formatCompetencia(comp: string): string {
  try {
    const d = parseISO(comp + '-01')
    const s = format(d, 'MMMM/yyyy', { locale: ptBR })
    return s.charAt(0).toUpperCase() + s.slice(1)
  } catch {
    return comp
  }
}

export default function ObrigacoesPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const [competencia, setCompetencia] = useState(() => format(new Date(), 'yyyy-MM'))
  const [filtroStatus, setFiltroStatus] = useState<ObrigacaoStatus | 'todos'>('todos')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [lancamentoRow, setLancamentoRow] = useState<Row | null>(null)
  const [dasRow, setDasRow] = useState<Row | null>(null)

  function toggleSort(col: SortColumn) {
    if (sortColumn === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDir('asc')
    }
  }

  const { data: configs = [] } = useObrigacaoConfigs(tenantId)
  const { data: lancamentos = [] } = useObrigacaoLancamentosByCompetencia(tenantId, competencia)
  const { data: clientes = [] } = useClients(tenantId)

  const rows = useMemo<Row[]>(() => {
    const active = configs.filter((c) => {
      if (!c.ativo) return false
      if (c.data_inicio > competencia + '-31') return false
      if (c.data_fim && c.data_fim.slice(0, 7) < competencia) return false
      return true
    })
    return active.map((config) => {
      const lancamento = lancamentos.find(
        (l) => l.client_id === config.client_id && l.tipo === config.tipo
      ) ?? null
      const cliente = clientes.find((cl) => cl.id === config.client_id)
      const statusDisplay: ObrigacaoStatus = lancamento?.status ?? 'pendente'
      return { config, lancamento, cliente, statusDisplay }
    })
  }, [configs, lancamentos, clientes, competencia])

  const filtered = filtroStatus === 'todos' ? rows : rows.filter((r) => r.statusDisplay === filtroStatus)

  const sorted = useMemo(() => {
    if (!sortColumn) return filtered
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortColumn === 'empresa') {
        const na = a.cliente?.fantasia ?? a.cliente?.razao_social ?? ''
        const nb = b.cliente?.fantasia ?? b.cliente?.razao_social ?? ''
        cmp = na.localeCompare(nb, 'pt-BR', { sensitivity: 'base' })
      } else if (sortColumn === 'faturamento') {
        cmp = (a.lancamento?.faturamento ?? -1) - (b.lancamento?.faturamento ?? -1)
      } else if (sortColumn === 'data_entrega') {
        cmp = (a.lancamento?.data_declaracao ?? '').localeCompare(b.lancamento?.data_declaracao ?? '')
      } else if (sortColumn === 'vencimento') {
        cmp = (a.lancamento?.das_vencimento ?? '').localeCompare(b.lancamento?.das_vencimento ?? '')
      } else if (sortColumn === 'status') {
        cmp = STATUS_ORDER[a.statusDisplay] - STATUS_ORDER[b.statusDisplay]
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortColumn, sortDir])

  function prevMonth() {
    setCompetencia(format(subMonths(parseISO(competencia + '-01'), 1), 'yyyy-MM'))
  }
  function nextMonth() {
    setCompetencia(format(addMonths(parseISO(competencia + '-01'), 1), 'yyyy-MM'))
  }

  // Th clicável — recebe className com largura explícita para table-fixed
  function ThSort({
    col, label, align = 'left', className = '',
  }: {
    col: SortColumn; label: string; align?: 'left' | 'right' | 'center'; className?: string
  }) {
    const flex = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
    return (
      <th
        className={`px-3 py-2.5 font-medium whitespace-nowrap cursor-pointer select-none
          hover:bg-muted/80 transition-colors ${className}`}
        onClick={() => toggleSort(col)}
      >
        <div className={`flex items-center gap-1 ${flex}`}>
          {label}
          <SortIcon col={col} sortColumn={sortColumn} sortDir={sortDir} />
        </div>
      </th>
    )
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 shrink-0" />
            Obrigações
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Simples Nacional — acompanhamento por competência
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/escritorio/obrigacoes/configuracoes')}>
          <Settings2 className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Configurar</span>
          <span className="sm:hidden">Config.</span>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-card border rounded-lg px-2 py-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm min-w-[128px] text-center select-none">
            {formatCompetencia(competencia)}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as ObrigacaoStatus | 'todos')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="gerar">Gerar</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="recalcular">Recalcular</SelectItem>
            <SelectItem value="transmitido">Transmitido</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <span className="shrink-0">{filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</span>
          {sortColumn && (
            <button
              className="text-xs text-primary hover:underline underline-offset-2 shrink-0"
              onClick={() => setSortColumn(null)}
            >
              limpar ordenação
            </button>
          )}
        </div>
      </div>

      {/*
        Tabela com table-fixed: a largura NUNCA ultrapassa o container.
        Colunas com largura explícita ocupam espaço fixo; Empresa recebe o restante.
        Responsividade por ocultação de colunas:
          xs  : Empresa | Status | Ações
          sm+ : + Vencimento(w-24) + Valor DAS(w-28)
          md+ : + Faturamento(w-28)
          lg+ : + Data Entrega(w-[82px])
      */}
      <div className="rounded-lg border bg-card">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              {/* Empresa — sem largura fixa, absorve o espaço restante */}
              <ThSort col="empresa" label="Empresa" align="left" className="px-3" />

              {/* Faturamento — md+ — 112px */}
              <ThSort col="faturamento" label="Faturamento" align="right"
                className="hidden md:table-cell w-28 px-3" />

              {/* Data Entrega — lg+ — 82px (2 linhas, formato curto) */}
              <ThSort col="data_entrega" label="Data Entrega" align="left"
                className="hidden lg:table-cell w-[82px] px-3" />

              {/* Vencimento — sm+ — 96px */}
              <ThSort col="vencimento" label="Vencimento" align="left"
                className="hidden sm:table-cell w-24 px-3" />

              {/* Valor DAS — sm+ — 112px */}
              <th className="hidden sm:table-cell w-28 px-2 py-2.5 font-medium text-right
                whitespace-nowrap text-muted-foreground">
                Valor DAS
              </th>

              {/* Status — 92px */}
              <ThSort col="status" label="Status" align="center" className="w-[92px] px-2" />

              {/* Ações — 116px */}
              <th className="w-[116px] px-2 py-2.5 font-medium text-right
                whitespace-nowrap text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhuma obrigação encontrada para este período
                </td>
              </tr>
            )}
            {sorted.map((row) => (
              <tr key={row.config.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                {/* Empresa — trunca se necessário */}
                <td className="px-3 py-2.5 font-medium overflow-hidden">
                  <span className="block truncate">
                    {row.cliente?.fantasia ?? row.cliente?.razao_social ?? '—'}
                  </span>
                </td>

                {/* Faturamento — md+ */}
                <td className="hidden md:table-cell px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                  {row.lancamento?.faturamento != null
                    ? formatCurrency(row.lancamento.faturamento)
                    : <span className="text-muted-foreground">—</span>}
                </td>

                {/* Data Entrega — lg+ — 2 linhas */}
                <td className="hidden lg:table-cell px-3 py-2.5 tabular-nums text-muted-foreground">
                  {row.lancamento?.data_declaracao ? (
                    <span className="flex flex-col leading-tight">
                      <span>{format(parseISO(row.lancamento.data_declaracao), 'dd/MM/yy')}</span>
                      <span className="text-xs opacity-60">
                        {format(parseISO(row.lancamento.data_declaracao), 'HH:mm')}
                      </span>
                    </span>
                  ) : '—'}
                </td>

                {/* Vencimento — sm+ */}
                <td className="hidden sm:table-cell px-3 py-2.5 tabular-nums whitespace-nowrap text-muted-foreground">
                  {row.lancamento?.das_vencimento
                    ? format(parseISO(row.lancamento.das_vencimento), 'dd/MM/yyyy')
                    : '—'}
                </td>

                {/* Valor DAS — sm+ */}
                <td className="hidden sm:table-cell px-2 py-2.5 text-right tabular-nums whitespace-nowrap">
                  {row.lancamento?.das_valor != null
                    ? formatCurrency(row.lancamento.das_valor)
                    : <span className="text-muted-foreground">—</span>}
                </td>

                {/* Status */}
                <td className="px-2 py-2.5 text-center">
                  <StatusBadge status={row.statusDisplay} />
                </td>

                {/* Ações */}
                <td className="px-2 py-2.5 text-right">
                  <RowActions
                    row={row}
                    onLancamento={() => setLancamentoRow(row)}
                    onDas={() => setDasRow(row)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lancamentoRow && (
        <LancamentoModal
          row={lancamentoRow}
          competencia={competencia}
          tenantId={tenantId}
          onClose={() => setLancamentoRow(null)}
        />
      )}
      {dasRow && (
        <DasModal
          row={dasRow}
          competencia={competencia}
          tenantId={tenantId}
          onClose={() => setDasRow(null)}
        />
      )}
    </div>
  )
}

function RowActions({
  row, onLancamento, onDas,
}: {
  row: Row; onLancamento: () => void; onDas: () => void
}) {
  const status = row.statusDisplay

  if (status === 'pendente') {
    return (
      <Button size="sm" variant="outline" onClick={onLancamento} className="h-7 text-xs px-2">
        Lançar
      </Button>
    )
  }

  if (status === 'gerar') {
    return (
      <div className="flex items-center gap-1 justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onLancamento}>
              <PencilLine className="w-3.5 h-3.5 mr-2" />
              Editar Faturamento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="outline" onClick={onDas} className="h-7 text-xs px-2">
          Gerar DAS
        </Button>
      </div>
    )
  }

  if (status === 'aberto') {
    return (
      <div className="flex items-center gap-1 justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDas}>
              <Eye className="w-3.5 h-3.5 mr-2" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDas}>
              <PencilLine className="w-3.5 h-3.5 mr-2" />
              Corrigir DAS
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="outline" onClick={onDas} className="h-7 text-xs px-2">
          <SendHorizonal className="w-3 h-3 mr-1" />
          Enviar
        </Button>
      </div>
    )
  }

  if (status === 'recalcular') {
    return (
      <div className="flex items-center gap-1 justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDas}>
              <Eye className="w-3.5 h-3.5 mr-2" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDas}>
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Atualizar DAS
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLancamento}>
              <PencilLine className="w-3.5 h-3.5 mr-2" />
              Editar Faturamento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="outline" onClick={onDas} className="h-7 text-xs px-2">
          <SendHorizonal className="w-3 h-3 mr-1" />
          Enviar
        </Button>
      </div>
    )
  }

  if (status === 'transmitido') {
    return (
      <Button size="sm" variant="ghost" onClick={onDas} className="h-7 text-xs px-2">
        <Eye className="w-3 h-3 mr-1" />
        Ver
      </Button>
    )
  }

  return null
}
