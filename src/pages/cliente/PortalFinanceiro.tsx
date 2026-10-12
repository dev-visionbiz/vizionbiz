import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { differenceInDays, parseISO, format } from 'date-fns'
import { useAuth } from '@/auth/AuthProvider'
import { usePortalAcesso } from '@/data/hooks/usePortalAcesso'
import { useClientInvoices } from '@/data/hooks/useInvoices'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { useClient } from '@/data/hooks/useClients'
import { PageLoader } from '@/components/shared/LoadingSpinner'

import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'
import type { Invoice } from '@/domain/types'
import { Search, FileText } from 'lucide-react'
import { CheckoutModal } from './CheckoutModal'
import { FaturaDocumentoDialog } from '@/pages/escritorio/Financeiro/FaturaDocumentoDialog'

// ─── types & constants ───────────────────────────────────────────────────────

type Kind = 'late' | 'open' | 'paid' | 'deal' | 'cancelled'
type FilterId = 'active' | 'all' | 'late' | 'open' | 'paid' | 'deal'

const BADGE: Record<Kind, { cls: string; text: string }> = {
  late:      { cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',         text: 'Em atraso'  },
  open:      { cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', text: 'A vencer'   },
  paid:      { cls: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300', text: 'Paga'       },
  deal:      { cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',     text: 'Negociada'  },
  cancelled: { cls: 'bg-muted text-muted-foreground',                                    text: 'Cancelada'  },
}

const COL = 'minmax(240px, 2.4fr) minmax(150px, 1.3fr) minmax(150px, 1.3fr) 140px 140px'

function money(n: number) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── component ───────────────────────────────────────────────────────────────

export default function PortalFinanceiro() {
  const { currentUser, currentTenant } = useAuth()
  const { secoesPermitidas, isLoading: loadingAcesso } = usePortalAcesso()
  const tenantId = currentUser?.tenant_id ?? ''
  const clientId = currentUser?.client_id ?? ''
  const navigate = useNavigate()

  const { data: rawInvoices, isLoading } = useClientInvoices(tenantId, clientId)
  const { data: policy } = useBillingPolicy(tenantId)
  const { data: client } = useClient(clientId)

  const accentRaw = currentTenant?.cor_primaria ?? '221 83% 53%'
  const accent = accentRaw.startsWith('#') || accentRaw.startsWith('rgb') || accentRaw.startsWith('hsl')
    ? accentRaw
    : `hsl(${accentRaw})`

  const [filter, setFilter] = useState<FilterId>('active')
  const [q, setQ] = useState('')
  const [checkoutInv, setCheckoutInv] = useState<Invoice | null>(null)
  const [faturaDoc, setFaturaDoc] = useState<Invoice | null>(null)

  if (loadingAcesso) return <PageLoader />
  if (!secoesPermitidas.includes('financeiro')) return <Navigate to="/portal/inicio" replace />
  if (isLoading) return <PageLoader />

  const today = new Date()
  const currentYear = today.getFullYear()
  const allInvoices = [...(rawInvoices ?? [])].sort(
    (a, b) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime()
  )

  // ── helpers ──────────────────────────────────────────────────────────────

  function getKind(inv: Invoice): Kind {
    if (inv.status === 'vencida') return 'late'
    if (inv.status === 'aberta') return 'open'
    if (inv.status === 'paga') return 'paid'
    if (inv.status === 'renegociada') return 'deal'
    return 'cancelled'
  }

  function getUpdated(inv: Invoice): number {
    if (inv.status !== 'vencida' || !policy) return inv.valor_original
    return calcularEncargos(inv, policy, today).total
  }

  function getTitle(inv: Invoice): string {
    if (inv.origem === 'renegociacao') return 'Parcela do acordo'
    if (inv.origem === 'avulsa') return 'Honorário avulso'
    return 'Honorário mensal'
  }

  function getRef(inv: Invoice): string {
    if (inv.origem === 'renegociacao') return 'Renegociação'
    const [year, month] = inv.competencia.split('-')
    return `Competência ${month}/${year}`
  }

  function getDaysUntil(inv: Invoice): number {
    return differenceInDays(parseISO(inv.vencimento), today)
  }

  // ── partitions ───────────────────────────────────────────────────────────

  const lateInvs = allInvoices.filter((i) => i.status === 'vencida')
  const openInvs = allInvoices.filter((i) => i.status === 'aberta')
  const paidInvs = allInvoices.filter((i) => i.status === 'paga')
  const dealInvs = allInvoices.filter((i) => i.status === 'renegociada')
  const dealOpen = openInvs.filter((i) => i.origem === 'renegociacao')
  const paidThisYear = paidInvs.filter((i) => i.competencia.startsWith(String(currentYear)))

  const sum = (arr: Invoice[], fn: (i: Invoice) => number) => arr.reduce((s, i) => s + fn(i), 0)

  const tileLate = sum(lateInvs, getUpdated)
  const tileOpen = sum(openInvs, (i) => i.valor_original)
  const tilePaid = sum(paidThisYear, (i) => i.valor_original)
  const tileDeal = sum(dealOpen, (i) => i.valor_original)

  const oldestDays = lateInvs.length
    ? Math.max(...lateInvs.map((i) => differenceInDays(today, parseISO(i.vencimento))))
    : 0

  const nextOpen = openInvs.length
    ? openInvs.slice().sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())[0]
    : null

  // ── tabs ─────────────────────────────────────────────────────────────────

  const tabDefs: { id: FilterId; label: string; count: number }[] = [
    { id: 'active', label: 'Em aberto',   count: lateInvs.length + openInvs.length + dealInvs.length },
    { id: 'late',   label: 'Em atraso',   count: lateInvs.length },
    { id: 'open',   label: 'A vencer',    count: openInvs.length },
    { id: 'deal',   label: 'Negociadas',  count: dealInvs.length },
    { id: 'paid',   label: 'Pagas',       count: paidInvs.length },
    { id: 'all',    label: 'Todas',       count: allInvoices.length },
  ]

  // ── filtered rows ────────────────────────────────────────────────────────

  const needle = q.trim().toLowerCase()
  const shown = allInvoices.filter((inv) => {
    if (filter === 'active' && inv.status !== 'vencida' && inv.status !== 'aberta' && inv.status !== 'renegociada') return false
    if (filter === 'late'   && inv.status !== 'vencida')     return false
    if (filter === 'open'   && inv.status !== 'aberta')      return false
    if (filter === 'paid'   && inv.status !== 'paga')        return false
    if (filter === 'deal'   && inv.status !== 'renegociada') return false
    if (needle) {
      const haystack = (getTitle(inv) + ' ' + getRef(inv)).toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })

  // ── client pill initials ──────────────────────────────────────────────────

  const clientName = client?.razao_social ?? ''
  const initials = clientName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  // ── handlers ─────────────────────────────────────────────────────────────

  function openReneg(preId?: string) {
    navigate(preId ? `/portal/negociacao?fatura=${preId}` : '/portal/negociacao')
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* ── header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[28px] font-bold tracking-tight leading-none">Financeiro</h1>
          <p className="m-0 text-[15px] text-muted-foreground">
            Todas as faturas do escritório: abertas, pagas e negociadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lateInvs.length > 0 && (
            <button
              type="button"
              onClick={() => openReneg()}
              className="inline-flex items-center gap-2.5 min-h-12 px-5 rounded-[14px] text-[15px] font-extrabold border-0 cursor-pointer text-white shadow-md"
              style={{ background: accent }}
            >
              Negociar em atraso
              <span
                className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full text-[13px] font-extrabold ring-2 ring-white/30"
                style={{ background: 'rgba(0,0,0,0.18)', color: '#fff' }}
              >
                {lateInvs.length}
              </span>
            </button>
          )}

          {clientName && (
            <div className="flex items-center gap-3 bg-card border border-border rounded-full py-1.5 pl-1.5 pr-4">
              <span
                aria-hidden
                className="w-9 h-9 rounded-full inline-flex items-center justify-center font-extrabold text-[13px]"
                style={{
                  background: `color-mix(in srgb, ${accent} 18%, hsl(var(--card)))`,
                  color: accent,
                }}
              >
                {initials}
              </span>
              <span className="text-sm font-bold">{clientName}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── KPI tiles ──────────────────────────────────────────────────── */}
      <section
        aria-label="Resumo financeiro"
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}
      >
        {/* Em atraso */}
        <div className="bg-card border border-red-300 dark:bg-red-950/30 dark:border-red-900 rounded-[18px] p-5 flex flex-col gap-1.5">
          <span className="text-[13px] font-extrabold tracking-widest uppercase text-red-500 dark:text-red-400">
            Em atraso
          </span>
          <span className="font-bold text-[30px] tracking-tight tabular-nums text-red-600 dark:text-red-200">
            {money(tileLate)}
          </span>
          <span className="text-[13px] text-red-500 dark:text-red-400">
            {lateInvs.length} fatura{lateInvs.length !== 1 ? 's' : ''} · a mais antiga há {oldestDays} dias
          </span>
        </div>

        {/* A vencer */}
        <div className="bg-card border border-border rounded-[18px] p-5 flex flex-col gap-1.5">
          <span className="text-[13px] font-extrabold tracking-widest uppercase text-muted-foreground">
            A vencer
          </span>
          <span className="font-bold text-[30px] tracking-tight tabular-nums text-foreground">
            {money(tileOpen)}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {openInvs.length} fatura{openInvs.length !== 1 ? 's' : ''}
            {nextOpen ? ` · próxima em ${format(parseISO(nextOpen.vencimento), 'dd/MM/yyyy')}` : ''}
          </span>
        </div>

        {/* Pago no ano */}
        <div className="bg-card border border-border rounded-[18px] p-5 flex flex-col gap-1.5">
          <span className="text-[13px] font-extrabold tracking-widest uppercase text-muted-foreground">
            Pago em {currentYear}
          </span>
          <span className="font-bold text-[30px] tracking-tight tabular-nums text-foreground">
            {money(tilePaid)}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {paidThisYear.length} fatura{paidThisYear.length !== 1 ? 's' : ''} pagas
          </span>
        </div>

        {/* Em acordo */}
        <div className="bg-card border border-border rounded-[18px] p-5 flex flex-col gap-1.5">
          <span className="text-[13px] font-extrabold tracking-widest uppercase text-blue-700 dark:text-blue-400">
            Em acordo
          </span>
          <span className="font-bold text-[30px] tracking-tight tabular-nums text-foreground">
            {money(tileDeal)}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {dealOpen.length} parcela{dealOpen.length !== 1 ? 's' : ''} restante{dealOpen.length !== 1 ? 's' : ''}
          </span>
        </div>
      </section>

      {/* ── invoice table ───────────────────────────────────────────────── */}
      <section aria-label="Lista de faturas" className="bg-card border border-border rounded-[20px] overflow-hidden">

        {/* filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-border">
          <div role="group" aria-label="Filtrar por situação" className="flex flex-wrap gap-2">
            {tabDefs.map((t) => {
              const on = t.id === filter
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(t.id)}
                  className="inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-full text-sm font-bold cursor-pointer transition-all"
                  style={
                    on
                      ? { border: `2px solid ${accent}`, background: accent, color: '#fff' }
                      : { border: '2px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }
                  }
                >
                  {t.label}
                  <span
                    className="text-xs font-extrabold px-1.5 py-0.5 rounded-full"
                    style={
                      on
                        ? { background: 'rgba(255,255,255,0.22)', color: '#fff' }
                        : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* search */}
          <div className="flex-1 basis-[200px] max-w-[320px] relative">
            <label htmlFor="busca" className="sr-only">Buscar fatura</label>
            <Search
              size={17}
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              id="busca"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por descrição"
              className="w-full min-h-10 pl-10 pr-3.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <div role="table" aria-label="Faturas" style={{ minWidth: 860 }}>

            {/* header row */}
            <div
              role="row"
              className="grid gap-4 px-6 py-3 bg-muted border-b border-border text-xs font-extrabold tracking-widest uppercase text-muted-foreground"
              style={{ gridTemplateColumns: COL }}
            >
              <div role="columnheader">Fatura</div>
              <div role="columnheader">Vencimento</div>
              <div role="columnheader">Valor</div>
              <div role="columnheader">Situação</div>
              <div role="columnheader" className="text-right">Ação</div>
            </div>

            {/* data rows */}
            {shown.map((inv) => {
              const kind = getKind(inv)
              const badge = BADGE[kind]
              const updated = getUpdated(inv)
              const daysUntil = getDaysUntil(inv)
              const daysLate = kind === 'late' ? differenceInDays(today, parseISO(inv.vencimento)) : 0

              let subText = ''
              let subCls = 'text-muted-foreground'
              if (kind === 'late')  { subText = `${daysLate} dias de atraso`; subCls = 'text-red-600 dark:text-red-400' }
              if (kind === 'open')  { subText = daysUntil === 0 ? 'Vence hoje' : `Vence em ${Math.abs(daysUntil)} dias` }
              if (kind === 'paid')  { subText = `Vencimento ${format(parseISO(inv.vencimento), 'dd/MM/yyyy')}` }
              if (kind === 'deal')  { subText = 'Incluída no acordo' }

              return (
                <div
                  key={inv.id}
                  role="row"
                  className={`grid gap-4 items-center px-6 py-3.5 border-b border-border last:border-0 ${
                    kind === 'late' ? 'border-l-2 border-l-red-400 dark:border-l-red-700 bg-card dark:bg-red-950/10' : 'bg-card'
                  }`}
                  style={{ gridTemplateColumns: COL }}
                >
                  {/* Fatura */}
                  <div role="cell" className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[15px] font-extrabold text-foreground">{getTitle(inv)}</span>
                    <span className="text-[13px] text-muted-foreground">{getRef(inv)}</span>
                  </div>

                  {/* Vencimento */}
                  <div role="cell" className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {format(parseISO(inv.vencimento), 'dd/MM/yyyy')}
                    </span>
                    <span className={`text-xs font-semibold ${subCls}`}>{subText}</span>
                  </div>

                  {/* Valor */}
                  <div role="cell" className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-extrabold tabular-nums text-foreground">
                      {money(inv.valor_original)}
                    </span>
                    {kind === 'late' && updated > inv.valor_original && (
                      <span className="text-xs font-semibold tabular-nums text-red-600 dark:text-red-400">
                        Atualizado {money(updated)}
                      </span>
                    )}
                  </div>

                  {/* Situação */}
                  <div role="cell">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </div>

                  {/* Ação */}
                  <div role="cell" className="flex items-center justify-end gap-1.5">
                    {kind === 'late' && (
                      <button
                        type="button"
                        onClick={() => openReneg(inv.id)}
                        className="min-h-[40px] px-4 rounded-xl border-0 text-sm font-extrabold cursor-pointer text-white"
                        style={{ background: accent }}
                      >
                        Negociar
                      </button>
                    )}
                    {kind === 'open' && (
                      <button
                        type="button"
                        onClick={() => setCheckoutInv(inv)}
                        className="min-h-[40px] px-4 rounded-xl bg-card text-sm font-extrabold cursor-pointer"
                        style={{ border: `1.5px solid ${accent}`, color: accent }}
                      >
                        Pagar
                      </button>
                    )}
                    {kind === 'paid' && (
                      <button
                        type="button"
                        onClick={() => setFaturaDoc(inv)}
                        className="min-h-[40px] px-4 rounded-xl border border-border bg-card text-foreground text-sm font-bold cursor-pointer hover:border-primary hover:text-primary transition-colors"
                      >
                        Recibo
                      </button>
                    )}
                    {kind === 'deal' && (
                      <button
                        type="button"
                        onClick={() => setFaturaDoc(inv)}
                        className="min-h-[40px] px-4 rounded-xl border border-border bg-card text-foreground text-sm font-bold cursor-pointer hover:border-primary hover:text-primary transition-colors"
                      >
                        Ver acordo
                      </button>
                    )}
                    {/* ícone ver fatura — disponível em qualquer situação */}
                    <button
                      type="button"
                      onClick={() => setFaturaDoc(inv)}
                      title="Ver documento da fatura"
                      className="min-h-10 w-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors cursor-pointer"
                    >
                      <FileText size={15} />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* empty state */}
            {shown.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                Nenhuma fatura encontrada para este filtro.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── dialogs ─────────────────────────────────────────────────────── */}
      {checkoutInv && (
        <CheckoutModal
          open={!!checkoutInv}
          onClose={() => setCheckoutInv(null)}
          invoice={checkoutInv}
          valorAtualizado={getUpdated(checkoutInv)}
          tenantId={tenantId}
          clientId={clientId}
        />
      )}

      {faturaDoc && (
        <FaturaDocumentoDialog
          open={!!faturaDoc}
          onClose={() => setFaturaDoc(null)}
          invoice={faturaDoc}
          tenantId={tenantId}
        />
      )}

    </div>
  )
}
