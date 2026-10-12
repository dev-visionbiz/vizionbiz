import { useState, useMemo } from 'react'
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { addDays, addMonths, format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '@/auth/AuthProvider'
import { usePortalAcesso } from '@/data/hooks/usePortalAcesso'
import { useClientInvoices, useUpdateInvoice, useCreateInvoice } from '@/data/hooks/useInvoices'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { useCreateRenegotiation } from '@/data/hooks/useRenegotiations'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'
import { simularRenegociacao } from '@/domain/financeiro/simularRenegociacao'
import type { Invoice } from '@/domain/types'
import { formatDate } from '@/lib/utils'
import { AlertTriangle, Lock, ChevronLeft, Copy, Check, CheckCircle } from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────

function money(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Tints with card background so it adapts to light/dark mode
function tintBg(accent: string, pct = 12) {
  return `color-mix(in srgb, ${accent} ${pct}%, hsl(var(--card)))`
}

const PLAN_OPTIONS = [1, 2, 3, 6] as const
type PlanN = (typeof PLAN_OPTIONS)[number]
type Method = 'pix' | 'boleto' | 'card'
type Step = 'select' | 'pay' | 'done'

// ─── step tracker ─────────────────────────────────────────────────────────────

function StepTracker({ step, accent }: { step: Step; accent: string }) {
  const order: Step[] = ['select', 'pay', 'done']
  const labels = ['Honorários', 'Pagamento', 'Concluído']
  const idx = order.indexOf(step)

  return (
    <ol
      aria-label="Etapas da negociação"
      className="list-none m-0 p-0 flex items-center gap-3"
    >
      {order.map((s, i) => {
        const past = i < idx || step === 'done'
        const cur  = i === idx && step !== 'done'
        const active = past || cur
        return (
          <li
            key={s}
            aria-current={cur ? 'step' : undefined}
            className="flex items-center gap-3"
            style={{ flex: i < 2 ? '1 1 auto' : '0 0 auto' }}
          >
            <span
              aria-hidden="true"
              className="shrink-0 w-[30px] h-[30px] rounded-full inline-flex items-center justify-center text-[13px] font-extrabold transition-all"
              style={{
                background: active ? accent : 'hsl(var(--muted))',
                color: active ? '#fff' : 'hsl(var(--muted-foreground))',
              }}
            >
              {i + 1}
            </span>
            <span
              className="text-sm"
              style={{
                fontWeight: cur ? 800 : 600,
                color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
              }}
            >
              {labels[i]}
            </span>
            {i < 2 && (
              <span
                aria-hidden="true"
                className="flex-1 min-w-[16px] h-0.5 rounded-sm transition-all"
                style={{ background: i < idx || step === 'done' ? accent : 'hsl(var(--border))' }}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function PortalNegociacao() {
  const { currentUser, currentTenant } = useAuth()
  const { secoesPermitidas, isLoading: loadingAcesso } = usePortalAcesso()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const tenantId = currentUser?.tenant_id ?? ''
  const clientId = currentUser?.client_id ?? ''
  const accentRaw = currentTenant?.cor_primaria ?? '221 83% 53%'
  const accent = accentRaw.startsWith('#') || accentRaw.startsWith('rgb') || accentRaw.startsWith('hsl')
    ? accentRaw
    : `hsl(${accentRaw})`

  const { data: invoices, isLoading } = useClientInvoices(tenantId, clientId)
  const { data: policy } = useBillingPolicy(tenantId)
  const createRenegotiation = useCreateRenegotiation()
  const updateInvoice = useUpdateInvoice()
  const createInvoice = useCreateInvoice()

  const [step, setStep]           = useState<Step>('select')
  const [sel, setSel]             = useState<Record<string, boolean>>({})
  const [planN, setPlanN]         = useState<PlanN>(1)
  const [method, setMethod]       = useState<Method>('pix')
  const [copied, setCopied]       = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (loadingAcesso) return <PageLoader />
  if (!secoesPermitidas.includes('financeiro')) return <Navigate to="/portal/inicio" replace />
  if (isLoading) return <PageLoader />

  const today = new Date()

  // abertas (a vencer) + vencidas — tudo que não foi pago
  const pendentes = (invoices ?? [])
    .filter((i) => (i.status === 'vencida' || i.status === 'aberta') && i.permite_renegociacao !== false)
    .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())

  const soVencidas = pendentes.filter((i) => i.status === 'vencida')

  if (pendentes.length === 0) {
    return <Navigate to="/portal/financeiro" replace />
  }

  const preId = searchParams.get('fatura')
  const initSel = pendentes.reduce<Record<string, boolean>>(
    (acc, i) => ({ ...acc, [i.id]: preId ? i.id === preId : true }),
    {}
  )
  const effectiveSel = Object.keys(sel).length > 0 ? sel : initSel
  const selectedInvs = pendentes.filter((i) => effectiveSel[i.id])
  const checkedCount = selectedInvs.length

  // ── calculations ──────────────────────────────────────────────────────────

  const encCalcs = pendentes.map((inv) => ({
    inv,
    calc: policy ? calcularEncargos(inv, policy, today) : null,
  }))

  const simulation = useMemo(() => {
    if (!policy || selectedInvs.length === 0) return null
    return simularRenegociacao(selectedInvs, policy, planN === 1 ? 0 : planN, today)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInvs.map((v) => v.id).join(','), policy, planN])

  const allTotal = encCalcs.reduce((s, { calc, inv }) => s + (calc?.total ?? inv.valor_original), 0)
  const oldestDays = soVencidas.length
    ? Math.max(...soVencidas.map((i) => {
        const due = new Date(i.vencimento + 'T00:00:00')
        return Math.round((today.getTime() - due.getTime()) / 86400000)
      }))
    : 0

  const planTotal    = simulation?.total ?? 0
  const valorParcela = simulation?.valor_parcela ?? planTotal
  const maxParcelas  = policy?.parcelas_max ?? 6
  const availablePlans = PLAN_OPTIONS.filter((n) => n === 1 || n <= maxParcelas)

  const firstT = addDays(today, 5)
  const schedule = Array.from({ length: planN }, (_, i) => ({
    label:   planN === 1 ? 'Pagamento único' : `Parcela ${i + 1} de ${planN}`,
    date:    format(addMonths(firstT, i), 'dd/MM/yyyy'),
    tag:     i === 0 ? ' · pague agora' : '',
    value:   money(valorParcela),
    isFirst: i === 0,
  }))

  const methodLabel =
    method === 'pix'    ? 'Já fiz o pagamento'       :
    method === 'boleto' ? 'Gerar boleto'              :
    `Pagar ${money(valorParcela)}`

  const payTitle  = planN === 1 ? 'Pague o acordo' : 'Pague a primeira parcela'
  const doneTitle =
    method === 'boleto' ? 'Boleto gerado'         :
    method === 'pix'    ? 'Pagamento confirmado'  :
    'Pagamento aprovado'
  const docsStatus = method !== 'boleto' ? 'Liberados' : 'Liberados após a compensação'
  const doneText =
    method === 'boleto'
      ? `Pague até ${format(firstT, 'dd/MM/yyyy')}. Assim que o banco confirmar, em até 2 dias úteis, seus documentos voltam a ficar disponíveis para download.`
      : `Recebemos ${money(valorParcela)} e o acordo está ativo. ${planN === 1
          ? 'Seus documentos já estão disponíveis para download.'
          : `Seus documentos já estão disponíveis; a próxima parcela vence em ${format(addMonths(firstT, 1), 'dd/MM/yyyy')}.`}`

  // ── handlers ──────────────────────────────────────────────────────────────

  function toggleAll() {
    const allOn = checkedCount === pendentes.length
    const next: Record<string, boolean> = {}
    pendentes.forEach((i) => { next[i.id] = !allOn })
    setSel(next)
  }

  function toggleOne(id: string) {
    setSel({ ...effectiveSel, [id]: !effectiveSel[id] })
  }

  async function pay() {
    if (!policy || !simulation || submitting) return
    setSubmitting(true)
    try {
      const renegId = uuidv4()
      const now = new Date()

      await createRenegotiation.mutateAsync({
        id: renegId,
        tenant_id: tenantId,
        client_id: clientId,
        invoice_ids: simulation.invoice_ids,
        saldo_principal: simulation.saldo_principal,
        multa: simulation.multa,
        juros: simulation.juros,
        correcao: simulation.correcao,
        encargo: simulation.encargo,
        total: simulation.total,
        parcelas: simulation.parcelas,
        termo_hash: '',
        aceite: { ip: '127.0.0.1', em: now.toISOString(), user_id: currentUser?.id ?? '' },
        status: 'aceita',
      })

      for (const id of simulation.invoice_ids) {
        await updateInvoice.mutateAsync({ id, data: { status: 'renegociada', renegotiation_id: renegId } })
      }

      for (let p = 1; p <= simulation.parcelas; p++) {
        await createInvoice.mutateAsync({
          id: uuidv4(),
          tenant_id: tenantId,
          client_id: clientId,
          competencia: format(addMonths(now, p), 'yyyy-MM'),
          vencimento: format(addMonths(now, p), 'yyyy-MM-dd'),
          valor_original: simulation.valor_parcela,
          status: 'aberta',
          origem: 'renegociacao',
          renegotiation_id: renegId,
        })
      }

      setStep('done')
    } catch {
      toast({ title: 'Erro ao finalizar acordo', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[28px] font-bold tracking-tight leading-none">Negociar honorários</h1>
          <p className="m-0 text-[15px] text-muted-foreground">
            Selecione os honorários em aberto e escolha a forma de pagamento.
          </p>
        </div>
        {step === 'select' && (
          <button
            type="button"
            onClick={() => navigate('/portal/financeiro')}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 pl-3 rounded-xl border border-border bg-card text-foreground text-sm font-bold cursor-pointer"
          >
            <ChevronLeft size={16} aria-hidden />
            Voltar
          </button>
        )}
      </header>

      {/* step tracker */}
      <StepTracker step={step} accent={accent} />

      {/* ── STEP 1: select ──────────────────────────────────────────────── */}
      {step === 'select' && (
        <div className="flex flex-col gap-6">

          {/* summary card */}
          <section
            aria-label="Resumo em aberto"
            className="flex flex-wrap items-stretch gap-6 bg-card border border-border rounded-[20px] p-7"
          >
            <div className="flex-1 basis-[260px] flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase text-muted-foreground">
                Total selecionado
              </span>
              <span className="font-bold text-[44px] tracking-tight leading-none tabular-nums text-foreground">
                {money(allTotal)}
              </span>
              <div className="flex flex-wrap gap-3 text-[13px]">
                {soVencidas.length > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {soVencidas.length} em atraso{oldestDays > 0 ? ` · mais antiga há ${oldestDays} dias` : ''}
                  </span>
                )}
                {pendentes.filter(i => i.status === 'aberta').length > 0 && (
                  <span className="text-muted-foreground">
                    {pendentes.filter(i => i.status === 'aberta').length} a vencer
                  </span>
                )}
              </div>
            </div>
            {soVencidas.length > 0 && (
              <div className="flex-1 basis-[300px] flex items-start gap-3.5 bg-card border border-red-300 dark:bg-red-950/30 dark:border-red-900 rounded-[14px] p-5">
                <span aria-hidden className="shrink-0 w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 inline-flex items-center justify-center">
                  <Lock size={20} />
                </span>
                <div className="flex flex-col gap-1">
                  <strong className="text-[15px] text-red-600 dark:text-red-200">Download de documentos bloqueado</strong>
                  <span className="text-sm leading-relaxed text-red-500 dark:text-red-400">
                    Regularize os honorários em atraso para voltar a baixar seus documentos.
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* invoice list + sidebar */}
          <div className="flex flex-wrap items-start gap-6">

            {/* list */}
            <section
              aria-label="Honorários em atraso"
              className="bg-card border border-border rounded-[20px] overflow-hidden"
              style={{ flex: '999 1 480px', minWidth: 0 }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-border">
                <h2 className="m-0 text-xl font-bold tracking-tight">Honorários em aberto</h2>
                <label className="inline-flex items-center gap-2.5 min-h-[44px] text-sm font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedCount === pendentes.length}
                    onChange={toggleAll}
                    className="w-5 h-5 m-0"
                    style={{ accentColor: accent }}
                  />
                  Selecionar todos
                </label>
              </div>

              <div className="flex flex-col gap-2.5 p-4">
                {encCalcs.map(({ inv, calc }) => {
                  const on = effectiveSel[inv.id] ?? false
                  const isLate = inv.status === 'vencida'
                  const days = calc?.dias_atraso ?? 0
                  const updated = calc?.total ?? inv.valor_original
                  const daysUntil = Math.round(
                    (new Date(inv.vencimento + 'T00:00:00').getTime() - today.getTime()) / 86400000
                  )
                  return (
                    <label
                      key={inv.id}
                      className="flex flex-wrap items-center gap-3.5 p-4 rounded-[14px] cursor-pointer transition-all"
                      style={{
                        border: `2px solid ${on ? accent : 'hsl(var(--border))'}`,
                        background: on ? tintBg(accent, 14) : 'hsl(var(--card))',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleOne(inv.id)}
                        aria-label={`Selecionar ${inv.competencia}`}
                        className="shrink-0 w-5 h-5 m-0"
                        style={{ accentColor: accent }}
                      />
                      <div className="flex-1 basis-[200px] min-w-0 flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-[15px] text-foreground">Honorário mensal</strong>
                          <span className="text-[13px] text-muted-foreground">Competência {inv.competencia}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
                          <span>{isLate ? `Venceu em ${formatDate(inv.vencimento)}` : `Vence em ${formatDate(inv.vencimento)}`}</span>
                          {isLate ? (
                            <span className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-extrabold px-2.5 py-0.5 rounded-full">
                              {days} dias de atraso
                            </span>
                          ) : (
                            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold px-2.5 py-0.5 rounded-full">
                              {daysUntil === 0 ? 'Vence hoje' : `em ${daysUntil} dias`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 ml-auto text-right flex flex-col gap-0.5">
                        <span className="font-bold text-xl tabular-nums text-foreground">{money(updated)}</span>
                        {isLate && updated > inv.valor_original && (
                          <span className="text-xs text-muted-foreground tabular-nums">Original {money(inv.valor_original)}</span>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>

              {policy && (
                <p className="m-0 px-6 pb-5 text-[13px] leading-relaxed text-muted-foreground">
                  Valores atualizados até {format(today, 'dd/MM/yyyy')}: multa de {policy.multa_pct}% e juros de {policy.juros_mes_pct}% ao mês sobre o valor original.
                </p>
              )}
            </section>

            {/* negotiation sidebar */}
            <aside
              aria-label="Negociação"
              className="bg-card border border-border rounded-[20px] p-6 flex flex-col gap-5"
              style={{ flex: '1 1 340px', minWidth: 0, boxShadow: '0 12px 32px -16px rgba(16,24,40,0.18)' }}
            >
              <div className="flex flex-col gap-1">
                <h2 className="m-0 text-xl font-bold tracking-tight">Negociar</h2>
                <span className="text-sm text-muted-foreground">
                  {checkedCount === 0
                    ? 'Nenhum honorário selecionado'
                    : `${checkedCount} honorário${checkedCount !== 1 ? 's' : ''} selecionado${checkedCount !== 1 ? 's' : ''}`}
                </span>
              </div>

              <dl className="m-0 grid gap-y-2.5 gap-x-4 text-sm tabular-nums" style={{ gridTemplateColumns: '1fr auto' }}>
                <dt className="text-muted-foreground">Valor original</dt>
                <dd className="m-0 text-right font-semibold text-foreground">{money(simulation?.saldo_principal ?? 0)}</dd>
                <dt className="text-muted-foreground">Multa moratória</dt>
                <dd className="m-0 text-right font-semibold text-foreground">{money(simulation?.multa ?? 0)}</dd>
                <dt className="text-muted-foreground">Juros de mora</dt>
                <dd className="m-0 text-right font-semibold text-foreground">{money(simulation?.juros ?? 0)}</dd>
                <dt className="text-muted-foreground">Encargo de negociação</dt>
                <dd className="m-0 text-right font-semibold text-foreground">{money(simulation?.encargo ?? 0)}</dd>
              </dl>

              <div className="flex items-baseline justify-between gap-3 pt-4 border-t border-dashed border-border">
                <span className="text-sm font-bold text-foreground">Total do acordo</span>
                <span className="font-bold text-[28px] tracking-tight tabular-nums text-foreground">{money(planTotal)}</span>
              </div>

              <fieldset className="m-0 p-0 border-0 min-w-0 flex flex-col gap-2.5">
                <legend className="p-0 mb-2 text-sm font-extrabold text-foreground">Como prefere pagar?</legend>
                {availablePlans.map((n) => {
                  const on = n === planN
                  const sim1 = policy && selectedInvs.length > 0
                    ? simularRenegociacao(selectedInvs, policy, n === 1 ? 0 : n, today)
                    : null
                  const t1 = sim1?.total ?? 0
                  const e1 = sim1?.encargo ?? 0
                  const label = n === 1 ? 'À vista no Pix' : `${n}x de ${money(sim1 ? t1 / n : 0)}`
                  const sub   = n === 1 ? 'Sem encargo de negociação' : `Total ${money(t1)} (encargo ${money(e1)})`
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setPlanN(n)}
                      className="flex items-center gap-3.5 w-full min-h-[56px] px-4 py-2.5 text-left cursor-pointer rounded-[14px] transition-all text-foreground"
                      style={{
                        border: `2px solid ${on ? accent : 'hsl(var(--border))'}`,
                        background: on ? tintBg(accent, 12) : 'hsl(var(--card))',
                      }}
                    >
                      <span
                        aria-hidden
                        className="shrink-0 w-5 h-5 rounded-full"
                        style={{
                          border: `2.5px solid ${on ? accent : 'hsl(var(--muted-foreground))'}`,
                          background: on ? accent : 'hsl(var(--card))',
                          boxShadow: `inset 0 0 0 3px hsl(var(--card))`,
                        }}
                      />
                      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="text-[15px] font-extrabold tabular-nums">{label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{sub}</span>
                      </span>
                    </button>
                  )
                })}
              </fieldset>

              <button
                type="button"
                onClick={() => { if (checkedCount > 0) { setStep('pay'); setCopied(false) } }}
                disabled={checkedCount === 0}
                className="min-h-[52px] border-0 rounded-[14px] text-base font-extrabold text-white transition-all"
                style={{ background: checkedCount === 0 ? 'hsl(var(--muted-foreground))' : accent, cursor: checkedCount === 0 ? 'not-allowed' : 'pointer' }}
              >
                Confirmar acordo
              </button>

              {policy && (
                <p className="m-0 text-xs leading-relaxed text-muted-foreground">
                  Pagando à vista não há encargo. No parcelamento incide {policy.encargo_renegociacao_valor}{policy.encargo_renegociacao_tipo === 'pct' ? '%' : ' fixo'} de encargo sobre o total.
                </p>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* ── STEP 2: pay ─────────────────────────────────────────────────── */}
      {step === 'pay' && (
        <div className="flex flex-col gap-5">
          <div>
            <button
              type="button"
              onClick={() => { setStep('select'); setCopied(false) }}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 pl-3 rounded-xl border border-border bg-card text-foreground text-sm font-bold cursor-pointer"
            >
              <ChevronLeft size={18} aria-hidden />
              Alterar acordo
            </button>
          </div>

          <div className="flex flex-wrap items-start gap-6">

            {/* payment form */}
            <section
              aria-label="Pagamento da primeira parcela"
              className="bg-card border border-border rounded-[20px] p-7 flex flex-col gap-6"
              style={{ flex: '999 1 480px', minWidth: 0 }}
            >
              <div className="flex flex-col gap-1">
                <h2 className="m-0 text-[24px] font-bold tracking-tight text-foreground">{payTitle}</h2>
                <p className="m-0 text-[15px] text-muted-foreground">
                  Vence em {format(firstT, 'dd/MM/yyyy')}. Escolha como prefere pagar.
                </p>
              </div>

              {/* method selection */}
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))' }}>
                {([
                  { id: 'pix'    as Method, icon: <PixIcon />,    label: 'Pix',              sub: 'Confirmação imediata' },
                  { id: 'boleto' as Method, icon: <BoletoIcon />, label: 'Boleto',            sub: 'Compensa em até 2 dias úteis' },
                  { id: 'card'   as Method, icon: <CardIcon />,   label: 'Cartão de crédito', sub: 'Aprovação imediata' },
                ]).map(({ id, icon, label, sub }) => {
                  const on = method === id
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => { setMethod(id); setCopied(false) }}
                      className="flex flex-col items-start gap-2.5 min-h-[92px] p-4 text-left cursor-pointer rounded-[14px] transition-all"
                      style={{
                        border: `2px solid ${on ? accent : 'hsl(var(--border))'}`,
                        background: on ? tintBg(accent, 14) : 'hsl(var(--card))',
                        color: on ? accent : 'hsl(var(--foreground))',
                      }}
                    >
                      {icon}
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-extrabold">{label}</span>
                        <span className="text-xs text-muted-foreground">{sub}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* pix */}
              {method === 'pix' && (
                <div className="flex flex-wrap items-start gap-6">
                  <div
                    role="img"
                    aria-label="QR Code do Pix"
                    className="shrink-0 w-[180px] h-[180px] border-2 border-dashed border-border rounded-2xl flex items-center justify-center text-center p-4 text-sm font-bold text-muted-foreground"
                  >
                    QR CODE PIX
                  </div>
                  <div className="flex-1 basis-[240px] min-w-0 flex flex-col gap-3.5">
                    <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">
                      Abra o app do seu banco, escolha Pix e leia o QR Code. Ou copie o código abaixo.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="pixcode" className="text-[13px] font-bold text-foreground">Pix Copia e Cola</label>
                      <input
                        id="pixcode"
                        type="text"
                        readOnly
                        value="00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.00580..."
                        className="min-h-[48px] w-full px-3.5 rounded-xl border border-border bg-muted text-foreground text-[13px] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText('pix-code'); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="self-start inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-border bg-card text-foreground text-sm font-bold cursor-pointer"
                    >
                      {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                      {copied ? 'Copiado' : 'Copiar código'}
                    </button>
                  </div>
                </div>
              )}

              {/* boleto */}
              {method === 'boleto' && (
                <div className="flex flex-col gap-3.5">
                  <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">
                    O boleto vence em {format(firstT, 'dd/MM/yyyy')}. O banco leva até 2 dias úteis para confirmar e só então seus documentos são liberados.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="linha" className="text-[13px] font-bold text-foreground">Linha digitável</label>
                    <input
                      id="linha"
                      type="text"
                      readOnly
                      value="23793.38128 60007.827136 96000.063305 8 94150000045000"
                      className="min-h-[48px] w-full px-3.5 rounded-xl border border-border bg-muted text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-border bg-card text-foreground text-sm font-bold cursor-pointer"
                    >
                      {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                      {copied ? 'Copiado' : 'Copiar linha digitável'}
                    </button>
                    <button
                      type="button"
                      className="min-h-[44px] px-4 rounded-xl border border-border bg-card text-foreground text-sm font-bold cursor-pointer"
                    >
                      Baixar boleto em PDF
                    </button>
                  </div>
                </div>
              )}

              {/* card */}
              {method === 'card' && (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
                  <div className="col-span-full flex flex-col gap-1.5">
                    <label htmlFor="cnum" className="text-[13px] font-bold text-foreground">Número do cartão</label>
                    <input id="cnum" type="text" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000"
                      className="min-h-[48px] px-3.5 rounded-xl border border-border bg-background text-foreground text-[15px] focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="col-span-full flex flex-col gap-1.5">
                    <label htmlFor="cnome" className="text-[13px] font-bold text-foreground">Nome impresso no cartão</label>
                    <input id="cnome" type="text" autoComplete="cc-name"
                      className="min-h-[48px] px-3.5 rounded-xl border border-border bg-background text-foreground text-[15px] focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="cval" className="text-[13px] font-bold text-foreground">Validade</label>
                    <input id="cval" type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA"
                      className="min-h-[48px] px-3.5 rounded-xl border border-border bg-background text-foreground text-[15px] focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ccvv" className="text-[13px] font-bold text-foreground">Código de segurança</label>
                    <input id="ccvv" type="text" inputMode="numeric" autoComplete="cc-csc" placeholder="CVV"
                      className="min-h-[48px] px-3.5 rounded-xl border border-border bg-background text-foreground text-[15px] focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={pay}
                disabled={submitting}
                className="min-h-[54px] border-0 rounded-[14px] text-base font-extrabold text-white transition-all"
                style={{ background: submitting ? 'hsl(var(--muted-foreground))' : accent, cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Processando…' : methodLabel}
              </button>
            </section>

            {/* summary sidebar */}
            <aside
              aria-label="Resumo do acordo"
              className="bg-card border border-border rounded-[20px] p-6 flex flex-col gap-5"
              style={{ flex: '1 1 320px', minWidth: 0, boxShadow: '0 12px 32px -16px rgba(16,24,40,0.18)' }}
            >
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-extrabold tracking-widest uppercase text-muted-foreground">A pagar agora</span>
                <span className="font-bold text-[36px] tracking-tight leading-none tabular-nums text-foreground">{money(valorParcela)}</span>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-dashed border-border">
                <h3 className="m-0 mb-1 text-sm font-extrabold text-foreground">Cronograma do acordo</h3>
                {schedule.map((x, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl"
                    style={{
                      border: `2px solid ${x.isFirst ? accent : 'hsl(var(--border))'}`,
                      background: x.isFirst ? tintBg(accent, 14) : 'hsl(var(--card))',
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-extrabold" style={{ color: x.isFirst ? accent : 'hsl(var(--foreground))' }}>
                        {x.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{x.date}{x.tag}</span>
                    </div>
                    <span
                      className="text-sm font-extrabold tabular-nums"
                      style={{ color: x.isFirst ? accent : 'hsl(var(--foreground))' }}
                    >
                      {x.value}
                    </span>
                  </div>
                ))}
              </div>

              <dl
                className="m-0 grid gap-y-2.5 gap-x-4 pt-4 border-t border-dashed border-border text-sm tabular-nums"
                style={{ gridTemplateColumns: '1fr auto' }}
              >
                <dt className="text-muted-foreground">Honorários incluídos</dt>
                <dd className="m-0 text-right font-bold text-foreground">{checkedCount}</dd>
                <dt className="text-muted-foreground">Total do acordo</dt>
                <dd className="m-0 text-right font-bold text-foreground">{money(planTotal)}</dd>
              </dl>
            </aside>
          </div>
        </div>
      )}

      {/* ── STEP 3: done ────────────────────────────────────────────────── */}
      {step === 'done' && (
        <section
          aria-label="Conclusão"
          className="self-center w-full max-w-[600px] bg-card border border-border rounded-[20px] p-9 flex flex-col items-start gap-5"
          style={{ boxShadow: '0 12px 32px -16px rgba(16,24,40,0.18)' }}
        >
          <span
            aria-hidden
            className="w-14 h-14 rounded-[18px] bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 inline-flex items-center justify-center"
          >
            <CheckCircle size={28} />
          </span>
          <h2 className="m-0 text-[28px] font-bold tracking-tight leading-tight text-foreground">{doneTitle}</h2>
          <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">{doneText}</p>

          <dl
            className="m-0 w-full grid gap-y-2.5 gap-x-4 p-4 bg-muted rounded-[14px] text-sm tabular-nums"
            style={{ gridTemplateColumns: '1fr auto' }}
          >
            <dt className="text-muted-foreground">Primeira parcela</dt>
            <dd className="m-0 text-right font-bold text-foreground">
              {money(valorParcela)} via {method === 'pix' ? 'Pix' : method === 'boleto' ? 'boleto' : 'cartão'}
            </dd>
            <dt className="text-muted-foreground">Acordo</dt>
            <dd className="m-0 text-right font-bold text-foreground">
              {planN === 1 ? 'À vista' : `${planN}x de ${money(valorParcela)}`}
            </dd>
            <dt className="text-muted-foreground">Total do acordo</dt>
            <dd className="m-0 text-right font-bold text-foreground">{money(planTotal)}</dd>
            <dt className="text-muted-foreground">Documentos</dt>
            <dd className="m-0 text-right font-bold text-foreground">{docsStatus}</dd>
          </dl>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/portal/documentos"
              className="inline-flex items-center min-h-[48px] px-5 rounded-xl text-[15px] font-extrabold text-white no-underline"
              style={{ background: accent }}
            >
              Ir para Documentos
            </Link>
            <Link
              to="/portal/financeiro"
              className="inline-flex items-center min-h-[48px] px-5 rounded-xl border border-border bg-card text-foreground text-[15px] font-bold no-underline"
            >
              Ver todas as faturas
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── icons ────────────────────────────────────────────────────────────────────

function PixIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5l5 5-5 5-5-5z" /><path d="M12 11.5l5 5-5 5-5-5z" />
    </svg>
  )
}

function BoletoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5v14M7.5 5v14M11 5v14M14 5v14M17 5v14M20 5v14" />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" />
    </svg>
  )
}
