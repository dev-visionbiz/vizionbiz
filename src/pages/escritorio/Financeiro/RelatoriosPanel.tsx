import { useState, useMemo } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Minus, AlertCircle, ClipboardList, BarChart3, Users } from 'lucide-react'
import type { Invoice, Client, ServicoRealizado, BillingPolicy } from '@/domain/types'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'

// ─── helpers ─────────────────────────────────────────────────────────────────

function money(n: number) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function compLabel(comp: string) {
  const [y, m] = comp.split('-')
  return format(new Date(Number(y), Number(m) - 1, 1), "MMM/yyyy", { locale: ptBR }).toUpperCase()
}

function prevComp(comp: string): string {
  const [y, m] = comp.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type AgingBucket = '1-30' | '31-60' | '61-90' | '90+'
function bucket(days: number): AgingBucket {
  if (days <= 30) return '1-30'
  if (days <= 60) return '31-60'
  if (days <= 90) return '61-90'
  return '90+'
}
const BUCKET_ORDER: AgingBucket[] = ['1-30', '31-60', '61-90', '90+']
const BUCKET_CLS: Record<AgingBucket, string> = {
  '1-30':  'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  '31-60': 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  '61-90': 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  '90+':   'bg-red-200 text-red-900 dark:bg-red-950/60 dark:text-red-200',
}

// ─── component ───────────────────────────────────────────────────────────────

interface Props {
  invoices: Invoice[]
  clients: Client[]
  servicosRealizados: ServicoRealizado[]
  policy: BillingPolicy | null | undefined
}

export function RelatoriosPanel({ invoices, clients, servicosRealizados, policy }: Props) {
  const today = new Date()
  const currentComp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const [selectedComp, setSelectedComp] = useState(currentComp)

  const clientName = (id: string) => clients.find(c => c.id === id)?.razao_social ?? id

  // ── 1. Resumo do fechamento ──────────────────────────────────────────────

  const invComp     = useMemo(() => invoices.filter(i => i.competencia === selectedComp), [invoices, selectedComp])
  const invPrevComp = useMemo(() => invoices.filter(i => i.competencia === prevComp(selectedComp)), [invoices, selectedComp])

  const totalComp     = invComp.reduce((s, i) => s + i.valor_original, 0)
  const totalPrevComp = invPrevComp.reduce((s, i) => s + i.valor_original, 0)
  const diff = totalPrevComp > 0 ? ((totalComp - totalPrevComp) / totalPrevComp) * 100 : null

  const honComComp  = invComp.filter(i => i.origem === 'contrato')
  const avulsasComp = invComp.filter(i => i.origem === 'avulsa')

  // Identifica faturas de contrato que também têm serviços assessórios (valor > valor_mensal_contrato aproximado)
  // Para simplificar: "unificadas" = origem contrato + tem ServicoRealizado vinculado
  const invoiceIdsComServico = new Set(
    servicosRealizados.filter(s => s.invoice_id).map(s => s.invoice_id!)
  )
  const honPuros    = honComComp.filter(i => !invoiceIdsComServico.has(i.id))
  const unificadas  = honComComp.filter(i => invoiceIdsComServico.has(i.id))

  const pagas  = invComp.filter(i => i.status === 'paga')
  const abertas = invComp.filter(i => i.status === 'aberta' || i.status === 'vencida')

  // available months (distinct competencias from invoices)
  const mesesDisponiveis = useMemo(() => {
    const set = new Set(invoices.map(i => i.competencia))
    return Array.from(set).sort((a, b) => b.localeCompare(a)).slice(0, 24)
  }, [invoices])

  // ── 2. Aging de inadimplência ────────────────────────────────────────────

  const vencidas = invoices.filter(i => i.status === 'vencida')

  interface AgingRow {
    clientId: string
    valor_original: number
    com_encargos: number
    dias: number
    bucket: AgingBucket
    invoiceCount: number
  }

  const agingByClient = useMemo(() => {
    const map = new Map<string, AgingRow>()
    for (const inv of vencidas) {
      const dias = differenceInDays(today, parseISO(inv.vencimento))
      const com_encargos = policy ? calcularEncargos(inv, policy, today).total : inv.valor_original
      const existing = map.get(inv.client_id)
      if (existing) {
        existing.valor_original += inv.valor_original
        existing.com_encargos += com_encargos
        existing.dias = Math.max(existing.dias, dias)
        existing.invoiceCount++
      } else {
        map.set(inv.client_id, {
          clientId: inv.client_id,
          valor_original: inv.valor_original,
          com_encargos,
          dias,
          bucket: bucket(dias),
          invoiceCount: 1,
        })
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.dias - a.dias)
      .map(r => ({ ...r, bucket: bucket(r.dias) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vencidas, policy])

  const agingTotals = useMemo(() => {
    const t: Record<AgingBucket, { count: number; valor: number }> = {
      '1-30': { count: 0, valor: 0 },
      '31-60': { count: 0, valor: 0 },
      '61-90': { count: 0, valor: 0 },
      '90+':   { count: 0, valor: 0 },
    }
    for (const r of agingByClient) {
      t[r.bucket].count++
      t[r.bucket].valor += r.com_encargos
    }
    return t
  }, [agingByClient])

  // ── 3. Lançamentos ──────────────────────────────────────────────────────

  const pendentes  = servicosRealizados.filter(s => s.status === 'pendente_cobranca')
  const faturadosComp = servicosRealizados.filter(s => s.status === 'incluido_fatura' && s.competencia === selectedComp)

  const totalPendentes  = pendentes.reduce((acc, s) => acc + s.valor, 0)
  const totalFaturComp  = faturadosComp.reduce((acc, s) => acc + s.valor, 0)

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── seletor de competência ── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-muted-foreground">Período de referência:</span>
        <select
          value={selectedComp}
          onChange={e => setSelectedComp(e.target.value)}
          className="h-9 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {mesesDisponiveis.length === 0 && (
            <option value={currentComp}>{compLabel(currentComp)}</option>
          )}
          {mesesDisponiveis.map(m => (
            <option key={m} value={m}>{compLabel(m)}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {invComp.length} fatura{invComp.length !== 1 ? 's' : ''} neste período
        </span>
      </div>

      {/* ══ SEÇÃO 1: Resumo do Fechamento ══════════════════════════════════ */}
      <section className="bg-card border border-border rounded-[20px] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <BarChart3 size={17} className="text-muted-foreground" />
          <h2 className="text-[15px] font-bold text-foreground">Resumo do fechamento — {compLabel(selectedComp)}</h2>
        </div>

        {invComp.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            Nenhuma fatura encontrada para este período.
          </div>
        ) : (
          <div className="p-5 space-y-5">

            {/* KPIs do fechamento */}
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px,100%),1fr))' }}>

              {/* Total faturado */}
              <div className="rounded-[14px] bg-muted/50 border border-border p-4">
                <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-1">Total faturado</p>
                <p className="text-[22px] font-extrabold tabular-nums text-foreground leading-tight">{money(totalComp)}</p>
                {diff !== null && (
                  <div className={`flex items-center gap-1 mt-1 text-[12px] font-semibold ${
                    diff > 0 ? 'text-green-600 dark:text-green-400' :
                    diff < 0 ? 'text-red-600 dark:text-red-400' :
                    'text-muted-foreground'
                  }`}>
                    {diff > 0 ? <TrendingUp size={13} /> : diff < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs {compLabel(prevComp(selectedComp))}
                  </div>
                )}
              </div>

              {/* Honorários puros */}
              <div className="rounded-[14px] bg-muted/50 border border-border p-4">
                <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-1">Honorários</p>
                <p className="text-[22px] font-extrabold tabular-nums text-foreground leading-tight">
                  {money(honPuros.reduce((s, i) => s + i.valor_original, 0))}
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">{honPuros.length} fatura{honPuros.length !== 1 ? 's' : ''} simples</p>
              </div>

              {/* Serviços assessórios incluídos */}
              <div className="rounded-[14px] bg-muted/50 border border-border p-4">
                <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-1">Com assessórios</p>
                <p className="text-[22px] font-extrabold tabular-nums text-foreground leading-tight">
                  {money(unificadas.reduce((s, i) => s + i.valor_original, 0))}
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">{unificadas.length} fatura{unificadas.length !== 1 ? 's' : ''} unificada{unificadas.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Avulsas */}
              <div className="rounded-[14px] bg-muted/50 border border-border p-4">
                <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-1">Avulsas</p>
                <p className="text-[22px] font-extrabold tabular-nums text-foreground leading-tight">
                  {money(avulsasComp.reduce((s, i) => s + i.valor_original, 0))}
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">{avulsasComp.length} fatura{avulsasComp.length !== 1 ? 's' : ''} avulsa{avulsasComp.length !== 1 ? 's' : ''}</p>
              </div>

            </div>

            {/* Situação das faturas do período */}
            <div>
              <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-2">Situação das faturas</p>
              <div className="rounded-[12px] border border-border overflow-hidden">
                <div className="grid text-xs font-extrabold tracking-widest uppercase text-muted-foreground bg-muted px-4 py-2.5 border-b border-border"
                  style={{ gridTemplateColumns: '1fr 80px 120px 100px' }}>
                  <div>Cliente</div>
                  <div className="text-center">Origem</div>
                  <div className="text-right">Valor</div>
                  <div className="text-right">Situação</div>
                </div>
                {invComp
                  .sort((a, b) => clientName(a.client_id).localeCompare(clientName(b.client_id), 'pt-BR'))
                  .map(inv => (
                    <div
                      key={inv.id}
                      className="grid items-center px-4 py-2.5 border-b border-border last:border-0 bg-card"
                      style={{ gridTemplateColumns: '1fr 80px 120px 100px' }}
                    >
                      <span className="text-[13px] font-medium text-foreground truncate pr-2">{clientName(inv.client_id)}</span>
                      <span className="text-[11px] text-center text-muted-foreground">
                        {inv.origem === 'contrato' ? (invoiceIdsComServico.has(inv.id) ? 'Unif.' : 'Contr.') : inv.origem === 'avulsa' ? 'Avulsa' : 'Reneg.'}
                      </span>
                      <span className="text-[13px] tabular-nums text-right font-semibold text-foreground">{money(inv.valor_original)}</span>
                      <div className="flex justify-end">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'paga'      ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' :
                          inv.status === 'vencida'   ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' :
                          inv.status === 'aberta'    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {inv.status === 'paga' ? 'Paga' : inv.status === 'vencida' ? 'Atrasada' : inv.status === 'aberta' ? 'Aberta' : inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Total pago vs a receber */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[12px] bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 px-4 py-3">
                <p className="text-[10px] font-extrabold tracking-widest uppercase text-green-700 dark:text-green-400 mb-1">Recebido</p>
                <p className="text-[18px] font-extrabold tabular-nums text-green-800 dark:text-green-200">
                  {money(pagas.reduce((s, i) => s + i.valor_original, 0))}
                </p>
                <p className="text-[12px] text-green-700 dark:text-green-400">{pagas.length} fatura{pagas.length !== 1 ? 's' : ''} pagas</p>
              </div>
              <div className="rounded-[12px] bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-4 py-3">
                <p className="text-[10px] font-extrabold tracking-widest uppercase text-amber-700 dark:text-amber-400 mb-1">A receber</p>
                <p className="text-[18px] font-extrabold tabular-nums text-amber-800 dark:text-amber-200">
                  {money(abertas.reduce((s, i) => s + i.valor_original, 0))}
                </p>
                <p className="text-[12px] text-amber-700 dark:text-amber-400">{abertas.length} fatura{abertas.length !== 1 ? 's' : ''} em aberto</p>
              </div>
            </div>

          </div>
        )}
      </section>

      {/* ══ SEÇÃO 2: Aging de Inadimplência ════════════════════════════════ */}
      <section className="bg-card border border-border rounded-[20px] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <AlertCircle size={17} className="text-muted-foreground" />
          <h2 className="text-[15px] font-bold text-foreground">Aging de inadimplência</h2>
          {agingByClient.length > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center">
              {agingByClient.length}
            </span>
          )}
        </div>

        {agingByClient.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Users size={28} className="text-green-500 dark:text-green-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">Sem inadimplência</p>
            <p className="text-xs text-muted-foreground mt-1">Nenhuma fatura em atraso no momento.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">

            {/* Buckets resumo */}
            <div className="grid grid-cols-4 gap-3">
              {BUCKET_ORDER.map(b => (
                <div key={b} className={`rounded-[12px] border px-3 py-2.5 ${BUCKET_CLS[b].replace(/text-\S+/, '')} border-border`}>
                  <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">{b} dias</p>
                  <p className="text-[15px] font-extrabold tabular-nums text-foreground mt-0.5">{money(agingTotals[b].valor)}</p>
                  <p className="text-[11px] text-muted-foreground">{agingTotals[b].count} cliente{agingTotals[b].count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>

            {/* Tabela de clientes em atraso */}
            <div className="rounded-[12px] border border-border overflow-hidden">
              <div className="grid text-xs font-extrabold tracking-widest uppercase text-muted-foreground bg-muted px-4 py-2.5 border-b border-border"
                style={{ gridTemplateColumns: 'minmax(0,1fr) 70px 120px 120px 90px' }}>
                <div>Cliente</div>
                <div className="text-center">Faturas</div>
                <div className="text-right">Principal</div>
                <div className="text-right">C/ encargos</div>
                <div className="text-center">Atraso</div>
              </div>
              {agingByClient.map(row => (
                <div
                  key={row.clientId}
                  className="grid items-center px-4 py-3 border-b border-border last:border-0 bg-card hover:bg-muted/20 transition-colors"
                  style={{ gridTemplateColumns: 'minmax(0,1fr) 70px 120px 120px 90px' }}
                >
                  <span className="text-[13px] font-bold text-foreground truncate pr-2">{clientName(row.clientId)}</span>
                  <span className="text-[13px] tabular-nums text-center text-muted-foreground">{row.invoiceCount}</span>
                  <span className="text-[13px] tabular-nums text-right text-foreground">{money(row.valor_original)}</span>
                  <span className={`text-[13px] tabular-nums text-right font-bold ${
                    row.bucket === '90+' ? 'text-red-700 dark:text-red-300' :
                    row.bucket === '61-90' ? 'text-red-600 dark:text-red-400' :
                    row.bucket === '31-60' ? 'text-orange-600 dark:text-orange-400' :
                    'text-amber-700 dark:text-amber-400'
                  }`}>
                    {money(row.com_encargos)}
                  </span>
                  <div className="flex justify-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${BUCKET_CLS[row.bucket]}`}>
                      {row.dias}d
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total do aging */}
            <div className="flex items-center justify-between rounded-[12px] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 px-4 py-3">
              <span className="text-[13px] font-bold text-red-700 dark:text-red-300">
                Total inadimplente ({agingByClient.length} cliente{agingByClient.length !== 1 ? 's' : ''})
              </span>
              <span className="text-[16px] font-extrabold tabular-nums text-red-800 dark:text-red-200">
                {money(agingByClient.reduce((s, r) => s + r.com_encargos, 0))}
              </span>
            </div>

          </div>
        )}
      </section>

      {/* ══ SEÇÃO 3: Lançamentos ═══════════════════════════════════════════ */}
      <section className="bg-card border border-border rounded-[20px] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <ClipboardList size={17} className="text-muted-foreground" />
          <h2 className="text-[15px] font-bold text-foreground">Lançamentos de serviços</h2>
        </div>

        <div className="p-5 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-[14px] border px-4 py-3 ${
              pendentes.length > 0
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                : 'bg-card border-border'
            }`}>
              <p className={`text-[10px] font-extrabold tracking-widest uppercase mb-1 ${
                pendentes.length > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
              }`}>Pendentes de cobrança</p>
              <p className={`text-[22px] font-extrabold tabular-nums ${pendentes.length > 0 ? 'text-amber-800 dark:text-amber-200' : 'text-foreground'}`}>
                {pendentes.length > 0 ? money(totalPendentes) : '—'}
              </p>
              <p className={`text-[12px] mt-1 ${pendentes.length > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
                {pendentes.length} serviço{pendentes.length !== 1 ? 's' : ''} aguardando fatura
              </p>
            </div>
            <div className="rounded-[14px] bg-card border border-border px-4 py-3">
              <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-1">
                Faturados em {compLabel(selectedComp)}
              </p>
              <p className="text-[22px] font-extrabold tabular-nums text-foreground">
                {faturadosComp.length > 0 ? money(totalFaturComp) : '—'}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                {faturadosComp.length} serviço{faturadosComp.length !== 1 ? 's' : ''} incluído{faturadosComp.length !== 1 ? 's' : ''} em faturas
              </p>
            </div>
          </div>

          {pendentes.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-2">
                Pendentes por cliente
              </p>
              <div className="rounded-[12px] border border-border overflow-hidden">
                {(() => {
                  const porCliente = pendentes.reduce<Record<string, { total: number; count: number }>>((acc, s) => {
                    if (!acc[s.cliente_id]) acc[s.cliente_id] = { total: 0, count: 0 }
                    acc[s.cliente_id].total += s.valor
                    acc[s.cliente_id].count++
                    return acc
                  }, {})
                  return Object.entries(porCliente)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([cid, data]) => (
                      <div
                        key={cid}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 bg-card"
                      >
                        <span className="flex-1 text-[13px] font-medium text-foreground truncate">{clientName(cid)}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {data.count} serviço{data.count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[13px] font-bold tabular-nums text-amber-700 dark:text-amber-300">
                          {money(data.total)}
                        </span>
                      </div>
                    ))
                })()}
              </div>
            </div>
          )}

        </div>
      </section>

    </div>
  )
}
