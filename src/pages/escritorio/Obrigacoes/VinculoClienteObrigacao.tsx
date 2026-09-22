import { useState, useMemo } from 'react'
import { Users, Link2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useAuth } from '@/auth/AuthProvider'
import { useObrigacoesAtivas } from '@/data/hooks/useObrigacoes'
import { useClients } from '@/data/hooks/useClients'
import {
  useClienteObrigacoes,
  useClienteObrigacoesPorCliente,
  useVincularCliente,
  useDesvincularCliente,
  useVincularLote,
  useDesvincularLote,
} from '@/data/hooks/useClienteObrigacoes'

type Modo = 'obrigacao' | 'cliente'
type SortState = { key: string; dir: 'asc' | 'desc' } | null

function applySortable<T>(rows: T[], sort: SortState): T[] {
  if (!sort) return rows
  const { key, dir } = sort
  return [...rows].sort((a, b) => {
    const av = String((a as Record<string, unknown>)[key] ?? '').toLowerCase()
    const bv = String((b as Record<string, unknown>)[key] ?? '').toLowerCase()
    return dir === 'asc' ? av.localeCompare(bv, 'pt-BR') : bv.localeCompare(av, 'pt-BR')
  })
}

function useSortState() {
  const [sort, setSort] = useState<SortState>(null)
  function toggle(key: string) {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
  }
  return { sort, toggle }
}

interface SortHeaderProps {
  label: string
  sortKey: string
  sort: SortState
  onSort: (key: string) => void
  className?: string
}

function SortHeader({ label, sortKey, sort, onSort, className }: SortHeaderProps) {
  const active = sort?.key === sortKey
  return (
    <button
      className={`flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${className ?? ''}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active ? (
        sort!.dir === 'asc'
          ? <ArrowUp className="h-3 w-3" />
          : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}

function mesAtual() {
  return format(new Date(), 'yyyy-MM')
}

export function VinculoClienteObrigacao() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const { data: obrigacoes = [] } = useObrigacoesAtivas(tenantId)
  const { data: clientes = [] } = useClients(tenantId)
  const vincularCliente = useVincularCliente()
  const desvincularCliente = useDesvincularCliente()
  const vincularLote = useVincularLote()
  const desvincularLote = useDesvincularLote()

  const [modo, setModo] = useState<Modo>('obrigacao')

  // --- Por Obrigação ---
  const [obrigacaoId, setObrigacaoId] = useState('')
  const [filtroRegime, setFiltroRegime] = useState('')
  const [search, setSearch] = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [dataInicioLote, setDataInicioLote] = useState(mesAtual)

  // --- Por Cliente ---
  const [clienteId, setClienteId] = useState('')
  const [searchObrigacao, setSearchObrigacao] = useState('')
  const [dataInicioCliente, setDataInicioCliente] = useState(mesAtual)

  const { data: vinculos = [] } = useClienteObrigacoes(tenantId, obrigacaoId)
  const { data: vinculosCliente = [] } = useClienteObrigacoesPorCliente(tenantId, clienteId)

  const { sort: sortObr, toggle: toggleObr } = useSortState()
  const { sort: sortCli, toggle: toggleCli } = useSortState()

  // Por Obrigação — derivados
  const vinculadosSet = useMemo(
    () => new Set(vinculos.filter((v) => v.ativo).map((v) => v.cliente_id)),
    [vinculos]
  )

  const regimesDisponiveis = useMemo(() => {
    const regimes = new Set(clientes.map((c) => c.regime).filter(Boolean) as string[])
    return Array.from(regimes).sort()
  }, [clientes])

  const clientesFiltrados = useMemo(() => {
    let result = clientes.filter((c) => c.status === 'ativo')
    if (filtroRegime) result = result.filter((c) => c.regime === filtroRegime)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) => c.razao_social.toLowerCase().includes(q) || c.fantasia?.toLowerCase().includes(q)
      )
    }
    return result
  }, [clientes, filtroRegime, search])

  const rowsObrigacao = useMemo(
    () =>
      clientesFiltrados.map((c) => ({
        ...c,
        regime: c.regime ?? '',
        _vinculado: vinculadosSet.has(c.id) ? 'Vinculado' : 'Não vinculado',
      })),
    [clientesFiltrados, vinculadosSet]
  )

  const sortedClientes = useMemo(
    () => applySortable(rowsObrigacao, sortObr),
    [rowsObrigacao, sortObr]
  )

  // Por Cliente — derivados
  const vinculadosClienteMap = useMemo(
    () => new Map(vinculosCliente.filter((v) => v.ativo).map((v) => [v.obrigacao_id, v])),
    [vinculosCliente]
  )

  const obrigacoesFiltradas = useMemo(() => {
    if (!searchObrigacao.trim()) return obrigacoes
    const q = searchObrigacao.toLowerCase()
    return obrigacoes.filter((o) => o.nome.toLowerCase().includes(q))
  }, [obrigacoes, searchObrigacao])

  const rowsCliente = useMemo(
    () =>
      obrigacoesFiltradas.map((o) => {
        const vinculo = vinculadosClienteMap.get(o.id)
        return {
          ...o,
          regime: o.regime ?? '',
          _dataInicio: vinculo?.data_inicio ?? '',
          _vinculado: vinculo ? 'Vinculado' : 'Não vinculado',
        }
      }),
    [obrigacoesFiltradas, vinculadosClienteMap]
  )

  const sortedObrigacoes = useMemo(
    () => applySortable(rowsCliente, sortCli),
    [rowsCliente, sortCli]
  )

  // Handlers Por Obrigação
  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleTodos() {
    if (selecionados.size === clientesFiltrados.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(clientesFiltrados.map((c) => c.id)))
    }
  }

  async function handleVincularSelecionados() {
    if (!obrigacaoId) return
    await vincularLote.mutateAsync({
      tenantId,
      clienteIds: Array.from(selecionados),
      obrigacaoId,
      existentes: vinculos,
      dataInicio: `${dataInicioLote}-01`,
    })
    setSelecionados(new Set())
  }

  async function handleDesvincularSelecionados() {
    if (!obrigacaoId) return
    const idsVinculos = vinculos
      .filter((v) => v.ativo && selecionados.has(v.cliente_id))
      .map((v) => v.id)
    await desvincularLote.mutateAsync(idsVinculos)
    setSelecionados(new Set())
  }

  async function handleVincularTodosRegime() {
    if (!obrigacaoId || !filtroRegime) return
    await vincularLote.mutateAsync({
      tenantId,
      clienteIds: clientesFiltrados.map((c) => c.id),
      obrigacaoId,
      existentes: vinculos,
      dataInicio: `${dataInicioLote}-01`,
    })
  }

  // Handlers Por Cliente
  async function handleVincularObrigacao(obrId: string) {
    await vincularCliente.mutateAsync({
      tenantId,
      clienteId,
      obrigacaoId: obrId,
      dataInicio: `${dataInicioCliente}-01`,
    })
  }

  async function handleDesvincularObrigacao(obrId: string) {
    const vinculo = vinculosCliente.find((v) => v.ativo && v.obrigacao_id === obrId)
    if (vinculo) await desvincularCliente.mutateAsync(vinculo.id)
  }

  const todosVinculados =
    clientesFiltrados.length > 0 && clientesFiltrados.every((c) => vinculadosSet.has(c.id))
  const algumSelecionado = selecionados.size > 0
  const todosSelec =
    clientesFiltrados.length > 0 && selecionados.size === clientesFiltrados.length

  return (
    <div className="px-4 sm:px-6 pb-8 space-y-4">
      {/* Modo Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={modo === 'obrigacao' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setModo('obrigacao')}
        >
          Por Obrigação
        </Button>
        <Button
          variant={modo === 'cliente' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setModo('cliente')}
        >
          Por Cliente
        </Button>
      </div>

      {/* ===== POR OBRIGAÇÃO ===== */}
      {modo === 'obrigacao' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={obrigacaoId} onValueChange={setObrigacaoId}>
              <SelectTrigger className="sm:w-72">
                <SelectValue placeholder="Selecione a obrigação" />
              </SelectTrigger>
              <SelectContent>
                {obrigacoes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {obrigacaoId && (
              <>
                <Select
                  value={filtroRegime || '_todos'}
                  onValueChange={(v) => setFiltroRegime(v === '_todos' ? '' : v)}
                >
                  <SelectTrigger className="sm:w-52">
                    <SelectValue placeholder="Todos os regimes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todos">Todos os regimes</SelectItem>
                    {regimesDisponiveis.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="sm:max-w-56"
                />
              </>
            )}
          </div>

          {!obrigacaoId ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecione uma obrigação para gerenciar os vínculos.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">
                  Início do vínculo:
                </label>
                <input
                  type="month"
                  value={dataInicioLote}
                  onChange={(e) => setDataInicioLote(e.target.value)}
                  className="h-8 rounded-md border px-2 text-sm bg-background"
                />
              </div>

              {algumSelecionado && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/60 border">
                  <span className="text-sm font-medium flex-1">
                    {selecionados.size} cliente{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
                  </span>
                  <Button size="sm" onClick={handleVincularSelecionados} disabled={vincularLote.isPending}>
                    Vincular
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDesvincularSelecionados}
                    disabled={desvincularLote.isPending}
                  >
                    Desvincular
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelecionados(new Set())}>
                    Cancelar
                  </Button>
                </div>
              )}

              {filtroRegime && !algumSelecionado && !todosVinculados && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVincularTodosRegime}
                    disabled={vincularLote.isPending}
                  >
                    Vincular todos de "{filtroRegime}"
                  </Button>
                </div>
              )}

              <div className="rounded-lg border">
                <div className="hidden sm:grid grid-cols-[2rem_1fr_12rem_8rem] gap-x-3 px-4 py-2 border-b bg-muted/40">
                  <Checkbox
                    checked={todosSelec}
                    onCheckedChange={toggleTodos}
                    aria-label="Selecionar todos"
                  />
                  <SortHeader label="Cliente" sortKey="razao_social" sort={sortObr} onSort={toggleObr} />
                  <SortHeader label="Regime" sortKey="regime" sort={sortObr} onSort={toggleObr} />
                  <SortHeader label="Status vínculo" sortKey="_vinculado" sort={sortObr} onSort={toggleObr} />
                </div>

                {sortedClientes.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum cliente encontrado.
                  </div>
                ) : (
                  <div className="divide-y">
                    {sortedClientes.map((row) => {
                      const vinculado = row._vinculado === 'Vinculado'
                      const sel = selecionados.has(row.id)
                      return (
                        <div
                          key={row.id}
                          className="hidden sm:grid grid-cols-[2rem_1fr_12rem_8rem] gap-x-3 px-4 py-3 items-center"
                        >
                          <Checkbox checked={sel} onCheckedChange={() => toggleSelecionado(row.id)} />
                          <div>
                            <p className="text-sm font-medium">{row.razao_social}</p>
                            {row.fantasia && (
                              <p className="text-xs text-muted-foreground">{row.fantasia}</p>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">{row.regime || '—'}</span>
                          {vinculado ? (
                            <Badge className="text-xs bg-green-100 text-green-800 border-transparent w-fit">
                              Vinculado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs w-fit text-muted-foreground">
                              Não vinculado
                            </Badge>
                          )}
                        </div>
                      )
                    })}

                    {/* Mobile */}
                    {sortedClientes.map((row) => {
                      const vinculado = row._vinculado === 'Vinculado'
                      const sel = selecionados.has(row.id)
                      return (
                        <div key={`m-${row.id}`} className="sm:hidden flex items-center gap-3 px-4 py-3">
                          <Checkbox checked={sel} onCheckedChange={() => toggleSelecionado(row.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{row.razao_social}</p>
                            {row.regime && (
                              <p className="text-xs text-muted-foreground">{row.regime}</p>
                            )}
                          </div>
                          {vinculado ? (
                            <Badge className="text-xs bg-green-100 text-green-800 border-transparent shrink-0">
                              Vinculado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
                              Não vinculado
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ===== POR CLIENTE ===== */}
      {modo === 'cliente' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="sm:w-80">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes
                  .filter((c) => c.status === 'ativo')
                  .sort((a, b) => a.razao_social.localeCompare(b.razao_social, 'pt-BR'))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.razao_social}{c.fantasia ? ` — ${c.fantasia}` : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {clienteId && (
              <Input
                placeholder="Buscar obrigação..."
                value={searchObrigacao}
                onChange={(e) => setSearchObrigacao(e.target.value)}
                className="sm:max-w-56"
              />
            )}
          </div>

          {!clienteId ? (
            <div className="text-center py-16 text-muted-foreground">
              <Link2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecione um cliente para gerenciar os vínculos de obrigações.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">
                  Início do vínculo:
                </label>
                <input
                  type="month"
                  value={dataInicioCliente}
                  onChange={(e) => setDataInicioCliente(e.target.value)}
                  className="h-8 rounded-md border px-2 text-sm bg-background"
                />
              </div>

              <div className="rounded-lg border">
                <div className="hidden sm:grid grid-cols-[1fr_8rem_9rem_8rem_8rem_7rem] gap-x-3 px-4 py-2 border-b bg-muted/40">
                  <SortHeader label="Obrigação" sortKey="nome" sort={sortCli} onSort={toggleCli} />
                  <SortHeader label="Periodicidade" sortKey="periodicidade" sort={sortCli} onSort={toggleCli} />
                  <SortHeader label="Regime" sortKey="regime" sort={sortCli} onSort={toggleCli} />
                  <SortHeader label="Início Vínculo" sortKey="_dataInicio" sort={sortCli} onSort={toggleCli} />
                  <SortHeader label="Status" sortKey="_vinculado" sort={sortCli} onSort={toggleCli} />
                  <span className="text-xs font-medium text-muted-foreground">Ação</span>
                </div>

                {sortedObrigacoes.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma obrigação encontrada.
                  </div>
                ) : (
                  <div className="divide-y">
                    {sortedObrigacoes.map((row) => {
                      const vinculado = row._vinculado === 'Vinculado'
                      return (
                        <div
                          key={row.id}
                          className="hidden sm:grid grid-cols-[1fr_8rem_9rem_8rem_8rem_7rem] gap-x-3 px-4 py-3 items-center"
                        >
                          <p className="text-sm font-medium">{row.nome}</p>
                          <span className="text-sm text-muted-foreground capitalize">
                            {row.periodicidade}
                          </span>
                          <span className="text-sm text-muted-foreground">{row.regime || '—'}</span>
                          <span className="text-sm text-muted-foreground">
                            {row._dataInicio ? row._dataInicio.slice(0, 7) : '—'}
                          </span>
                          {vinculado ? (
                            <Badge className="text-xs bg-green-100 text-green-800 border-transparent w-fit">
                              Vinculado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs w-fit text-muted-foreground">
                              Não vinculado
                            </Badge>
                          )}
                          {vinculado ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleDesvincularObrigacao(row.id)}
                              disabled={desvincularCliente.isPending}
                            >
                              Desvincular
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleVincularObrigacao(row.id)}
                              disabled={vincularCliente.isPending}
                            >
                              Vincular
                            </Button>
                          )}
                        </div>
                      )
                    })}

                    {/* Mobile */}
                    {sortedObrigacoes.map((row) => {
                      const vinculado = row._vinculado === 'Vinculado'
                      return (
                        <div
                          key={`m-${row.id}`}
                          className="sm:hidden flex items-center gap-3 px-4 py-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{row.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.periodicidade} · {row.regime || '—'}
                            </p>
                            {row._dataInicio && (
                              <p className="text-xs text-muted-foreground">
                                Início: {row._dataInicio.slice(0, 7)}
                              </p>
                            )}
                          </div>
                          {vinculado ? (
                            <Badge className="text-xs bg-green-100 text-green-800 border-transparent shrink-0">
                              Vinculado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
                              Não vinculado
                            </Badge>
                          )}
                          {vinculado ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs shrink-0"
                              onClick={() => handleDesvincularObrigacao(row.id)}
                              disabled={desvincularCliente.isPending}
                            >
                              Desvincular
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-xs shrink-0"
                              onClick={() => handleVincularObrigacao(row.id)}
                              disabled={vincularCliente.isPending}
                            >
                              Vincular
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
