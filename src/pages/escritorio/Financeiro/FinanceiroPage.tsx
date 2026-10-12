import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { differenceInDays, parseISO, format } from 'date-fns'
import { useAuth } from '@/auth/AuthProvider'
import { usePinnedClient } from '@/lib/clientePinado'
import { useInvoices, useCreateInvoice, useUpdateInvoice } from '@/data/hooks/useInvoices'
import { useContracts } from '@/data/hooks/useContracts'
import { useContratoItems } from '@/data/hooks/useContratoItems'
import { useClients } from '@/data/hooks/useClients'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { useCreateOcorrenciasLote } from '@/data/hooks/useOcorrencias'
import { useServicosRealizados, useUpdateServicoRealizado } from '@/data/hooks/useServicosRealizados'
import { useServicosAtivos } from '@/data/hooks/useServicos'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Receipt, Search, Flag, ChevronDown, ChevronUp, RotateCcw, X, FileText, Wrench, ClipboardList, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import type { Invoice, InvoiceStatus, BillingPolicy, ServicoRealizado } from '@/domain/types'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'
import { v4 as uuidv4 } from 'uuid'
import { RegistrarServicoDialog } from './RegistrarServicoDialog'
import { FaturaDocumentoDialog } from './FaturaDocumentoDialog'
import { RelatoriosPanel } from './RelatoriosPanel'

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

function statusToKind(s: InvoiceStatus): Kind {
  if (s === 'vencida')     return 'late'
  if (s === 'aberta')      return 'open'
  if (s === 'paga')        return 'paid'
  if (s === 'renegociada') return 'deal'
  return 'cancelled'
}

const COL = 'minmax(220px, 2.4fr) minmax(140px, 1.2fr) minmax(150px, 1.3fr) 130px 190px'

function money(n: number) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── lote types & helpers ────────────────────────────────────────────────────

const TEMPLATE_DEFAULT = 'Referente honorários dos serviços contábeis contratados Competência [mes/ano]'

function resolveTemplate(template: string, comp: string): string {
  const parts = comp.split('-')
  if (parts.length !== 2) return template
  return template.replace('[mes/ano]', `${parts[1]}/${parts[0]}`).slice(0, 250)
}

// BRL money helpers
function parseBRL(s: string): number {
  if (!s) return 0
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}
function numToBRL(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function inputToBRL(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type AvulsaExtraItem = { id: string; nome: string; valor: number }

type LoteItemBase = {
  contractId: string
  clientId: string
  clientName: string
  vencimento: string
  valor: number
  jaExiste: boolean
  templateCobranca: string      // template resolvido para este cliente (client > policy > default)
  descrCobrancaInicial: string  // template já com [mes/ano] substituído pela competência
  servicosPendentes: ServicoRealizado[]  // lançamentos ainda não faturados deste cliente
}

type LoteRowOverride = {
  selected: boolean
  vencimento: string
  valor: number
  baseValor: number           // valor do contrato (referência para recalculo)
  permiteRenegociacao: boolean
  solicitarRevisao: boolean
  expanded: boolean
  descricao_cobranca: string  // para remessa bancária/boleto — máx 250 chars
  servicosIncluidos: string[] // IDs de ServicoRealizado a incluir na fatura
}

type LoteRowOverrides = Record<string, LoteRowOverride>

const COL_LOTE = '32px minmax(110px,1fr) 128px 112px 52px 52px 28px'

// ─── LoteRowItem ──────────────────────────────────────────────────────────────

function LoteRowItem({
  tenantId,
  loteComp,
  item,
  ov,
  onChange,
}: {
  tenantId: string
  loteComp: string
  item: LoteItemBase
  ov: LoteRowOverride
  onChange: (patch: Partial<LoteRowOverride>) => void
}) {
  const { data: contratoItems, isLoading: loadingItems } = useContratoItems(tenantId, item.contractId)

  const toggleServicoPendente = (servicoId: string, checked: boolean) => {
    const servico = item.servicosPendentes.find(s => s.id === servicoId)
    if (!servico) return
    const novosIds = checked
      ? [...ov.servicosIncluidos, servicoId]
      : ov.servicosIncluidos.filter(id => id !== servicoId)
    const extraTotal = item.servicosPendentes
      .filter(s => novosIds.includes(s.id))
      .reduce((acc, s) => acc + s.valor, 0)
    onChange({ servicosIncluidos: novosIds, valor: ov.baseValor + extraTotal })
  }

  return (
    <>
      <div
        className={`grid items-center gap-2 px-4 py-2.5 bg-card border-b border-border transition-colors ${
          item.jaExiste ? 'opacity-50' : ov.expanded ? 'bg-muted/30' : 'hover:bg-muted/20'
        }`}
        style={{ gridTemplateColumns: COL_LOTE }}
      >
        {/* checkbox */}
        <input
          type="checkbox"
          disabled={item.jaExiste}
          checked={ov.selected}
          className="h-4 w-4 accent-primary disabled:cursor-not-allowed"
          onChange={() => onChange({ selected: !ov.selected })}
        />

        {/* cliente */}
        <div className="min-w-0">
          <span className="text-[13px] font-semibold text-foreground truncate block leading-tight">{item.clientName}</span>
          {item.jaExiste && <span className="text-[11px] text-muted-foreground">Fatura já gerada</span>}
          {!item.jaExiste && item.servicosPendentes.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 rounded-full px-1.5 py-0.5 mt-0.5">
              <Clock size={9} />
              {item.servicosPendentes.length} pendente{item.servicosPendentes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* vencimento editável */}
        <input
          type="date"
          disabled={item.jaExiste}
          value={ov.vencimento}
          className="h-8 px-2 text-xs rounded-lg border border-border bg-background text-foreground w-full disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-ring"
          onChange={(e) => onChange({ vencimento: e.target.value })}
        />

        {/* valor editável */}
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none select-none">R$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={item.jaExiste}
            value={ov.valor === 0 ? '' : ov.valor}
            className="h-8 pl-6 pr-2 text-xs rounded-lg border border-border bg-background text-foreground w-full text-right tabular-nums disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-ring"
            onChange={(e) => onChange({ valor: parseFloat(e.target.value) || 0 })}
          />
        </div>

        {/* permite renegociação individual */}
        <div className="flex justify-center">
          <Switch
            disabled={item.jaExiste}
            checked={ov.permiteRenegociacao}
            onCheckedChange={(v) => onChange({ permiteRenegociacao: v })}
            className="scale-[0.72]"
          />
        </div>

        {/* solicitar revisão de contrato */}
        <div className="flex justify-center">
          <button
            type="button"
            disabled={item.jaExiste}
            onClick={() => onChange({ solicitarRevisao: !ov.solicitarRevisao })}
            title={ov.solicitarRevisao ? 'Remover solicitação de revisão' : 'Solicitar revisão de valores do contrato'}
            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              ov.solicitarRevisao
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Flag size={13} />
          </button>
        </div>

        {/* expandir serviços */}
        <button
          type="button"
          onClick={() => onChange({ expanded: !ov.expanded })}
          title={ov.expanded ? 'Recolher serviços' : 'Ver serviços do contrato'}
          className="h-7 w-7 rounded-lg flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {ov.expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* painel expandido */}
      {ov.expanded && (
        <div className="bg-muted/20 border-b border-border">

          {/* serviços do contrato */}
          <div className="px-12 pt-3 pb-2">
            <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-2">
              Serviços do contrato
            </p>
            {loadingItems ? (
              <p className="text-xs text-muted-foreground">Carregando serviços...</p>
            ) : !contratoItems || contratoItems.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">Nenhum serviço cadastrado neste contrato.</p>
            ) : (
              <div className="space-y-1.5">
                {contratoItems.map((ci) => (
                  <div key={ci.id} className="flex items-center gap-3">
                    <span className="flex-1 text-[13px] font-medium text-foreground">{ci.nome}</span>
                    <span className="text-xs text-muted-foreground w-8 text-center">{ci.quantidade}x</span>
                    <span className="text-[13px] font-semibold tabular-nums text-foreground w-28 text-right">
                      {money(ci.valor_unitario * ci.quantidade)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-border mt-2 pt-2 flex items-center justify-end gap-2">
                  <span className="text-xs text-muted-foreground">Total dos serviços:</span>
                  <span className="text-[13px] font-bold tabular-nums text-foreground">
                    {money(contratoItems.reduce((s, ci) => s + ci.valor_unitario * ci.quantidade, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* descrição para cobrança bancária */}
          <div className="px-12 pt-2 pb-3 border-t border-border/60">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">
                Descrição para cobrança bancária / boleto
              </p>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] tabular-nums font-semibold ${
                  ov.descricao_cobranca.length > 240 ? 'text-red-500' :
                  ov.descricao_cobranca.length > 200 ? 'text-amber-500' :
                  'text-muted-foreground'
                }`}>
                  {ov.descricao_cobranca.length}/250
                </span>
                {!item.jaExiste && (
                  <button
                    type="button"
                    onClick={() => onChange({ descricao_cobranca: item.descrCobrancaInicial })}
                    title="Restaurar descrição padrão"
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw size={11} /> restaurar
                  </button>
                )}
              </div>
            </div>
            <textarea
              maxLength={250}
              rows={2}
              disabled={item.jaExiste}
              value={ov.descricao_cobranca}
              placeholder="Descrição para o banco/boleto"
              className="w-full resize-none text-xs rounded-lg border border-border bg-background text-foreground px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
              onChange={(e) => onChange({ descricao_cobranca: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Gerado do template configurado no cliente (ou padrão do escritório) · editável antes de enviar ao banco
            </p>
          </div>

          {/* lançamentos pendentes do cliente */}
          <div className="px-12 pb-3 border-t border-border/60 pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">
                Lançamentos pendentes
              </p>
              {item.servicosPendentes.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      const allIds = item.servicosPendentes.map(s => s.id)
                      const extraTotal = item.servicosPendentes.reduce((acc, s) => acc + s.valor, 0)
                      onChange({ servicosIncluidos: allIds, valor: ov.baseValor + extraTotal })
                    }}
                  >
                    Incluir todos
                  </button>
                  <span className="text-[10px] text-border">|</span>
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => onChange({ servicosIncluidos: [], valor: ov.baseValor })}
                  >
                    Excluir todos
                  </button>
                </div>
              )}
            </div>

            {item.servicosPendentes.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">Nenhum lançamento pendente para este cliente.</p>
            ) : (
              <div className="space-y-1">
                {item.servicosPendentes.map(s => {
                  const checked = ov.servicosIncluidos.includes(s.id)
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${checked ? 'bg-amber-50 dark:bg-amber-950/20' : 'opacity-60'}`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleServicoPendente(s.id, !!v)}
                        disabled={item.jaExiste}
                        className="shrink-0"
                      />
                      <span className="flex-1 text-[13px] font-medium text-foreground truncate">{s.nome}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{s.competencia}</span>
                      <span className={`text-[13px] font-semibold tabular-nums w-24 text-right ${checked ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}`}>
                        {money(s.valor)}
                      </span>
                    </div>
                  )
                })}
                {ov.servicosIncluidos.length > 0 && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/60 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {ov.servicosIncluidos.length} serviço{ov.servicosIncluidos.length !== 1 ? 's' : ''} incluído{ov.servicosIncluidos.length !== 1 ? 's' : ''}:
                    </span>
                    <span className="text-[12px] font-bold tabular-nums text-amber-700 dark:text-amber-300">
                      + {money(item.servicosPendentes.filter(s => ov.servicosIncluidos.includes(s.id)).reduce((acc, s) => acc + s.valor, 0))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </>
  )
}

// ─── InvoiceDetailDialog ─────────────────────────────────────────────────────

function InvoiceDetailDialog({
  inv,
  tenantId,
  clientName,
  getRef,
  policy,
  today,
  onClose,
  onPay,
  onCancel,
  onVerFatura,
}: {
  inv: Invoice
  tenantId: string
  clientName: (id: string) => string
  getRef: (inv: Invoice) => string
  policy: BillingPolicy | null | undefined
  today: Date
  onClose: () => void
  onPay: (inv: Invoice) => void
  onCancel: (inv: Invoice) => Promise<boolean>
  onVerFatura: (inv: Invoice) => void
}) {
  const kind = statusToKind(inv.status)
  const badge = BADGE[kind]
  const { data: contratoItems, isLoading: loadingItems } = useContratoItems(tenantId, inv.contract_id ?? '')
  const encargos = kind === 'late' && policy ? calcularEncargos(inv, policy, today) : null
  const daysLate  = kind === 'late' ? differenceInDays(today, parseISO(inv.vencimento)) : 0
  const daysUntil = kind === 'open' ? differenceInDays(parseISO(inv.vencimento), today)  : 0

  const origemLabel = inv.origem === 'contrato' ? 'Contrato' : inv.origem === 'avulsa' ? 'Avulso' : 'Renegociação'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* ── header ── */}
        <DialogHeader className="shrink-0">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex flex-col gap-0.5 min-w-0">
              <DialogTitle className="text-[18px] leading-tight truncate">
                {clientName(inv.client_id)}
              </DialogTitle>
              <span className="text-[13px] text-muted-foreground">{getRef(inv)}</span>
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold shrink-0 mt-0.5 ${badge.cls}`}>
              {badge.text}
            </span>
          </div>
        </DialogHeader>

        {/* ── scrollable body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 py-1 px-0.5">

          {/* info cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[14px] bg-muted/50 border border-border p-4 flex flex-col gap-1">
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">Vencimento</span>
              <span className="text-[15px] font-bold tabular-nums text-foreground">
                {format(parseISO(inv.vencimento), 'dd/MM/yyyy')}
              </span>
              {kind === 'late' && (
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {daysLate} dia{daysLate !== 1 ? 's' : ''} de atraso
                </span>
              )}
              {kind === 'open' && (
                <span className="text-xs font-semibold text-muted-foreground">
                  {daysUntil === 0 ? 'Vence hoje' : `Vence em ${daysUntil} dias`}
                </span>
              )}
              {(kind === 'paid' || kind === 'cancelled' || kind === 'deal') && (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
            <div className="rounded-[14px] bg-muted/50 border border-border p-4 flex flex-col gap-1">
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">Origem</span>
              <span className="text-[15px] font-bold text-foreground">{origemLabel}</span>
              <span className="text-xs text-muted-foreground">
                {inv.permite_renegociacao === false ? 'Quitação à vista' : 'Aceita negociação'}
              </span>
            </div>
          </div>

          {/* valores */}
          <div>
            <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-2">Valores</p>
            <div className="rounded-[14px] border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Valor original</span>
                <span className="text-[15px] font-bold tabular-nums text-foreground">{money(inv.valor_original)}</span>
              </div>
              {encargos && !encargos.dentro_carencia && (
                <>
                  <div className="border-t border-border px-4 py-3 bg-red-50/60 dark:bg-red-950/10 space-y-1.5">
                    <p className="text-[10px] font-extrabold tracking-widest uppercase text-red-600 dark:text-red-400 mb-2">
                      Encargos por atraso
                    </p>
                    {encargos.memoria.filter(m => m.valor > 0).map((m, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{m.descricao}</span>
                        <span className="text-xs font-semibold tabular-nums text-red-600 dark:text-red-400">
                          + {money(m.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-950/20">
                    <span className="text-sm font-bold text-red-700 dark:text-red-300">Total com encargos</span>
                    <span className="text-[17px] font-extrabold tabular-nums text-red-700 dark:text-red-300">
                      {money(encargos.total)}
                    </span>
                  </div>
                </>
              )}
              {encargos && encargos.dentro_carencia && (
                <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  Dentro do prazo de carência — sem encargos adicionais
                </div>
              )}
            </div>
          </div>

          {/* serviços do contrato */}
          {inv.contract_id && (
            <div>
              <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-2">
                Serviços do contrato
              </p>
              <div className="rounded-[14px] border border-border overflow-hidden">
                {loadingItems ? (
                  <div className="px-4 py-4 text-sm text-muted-foreground">Carregando...</div>
                ) : !contratoItems || contratoItems.length === 0 ? (
                  <div className="px-4 py-4 text-sm italic text-muted-foreground">
                    Nenhum serviço registrado neste contrato.
                  </div>
                ) : (
                  <>
                    {contratoItems.map((ci) => (
                      <div key={ci.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0">
                        <span className="flex-1 text-sm font-medium text-foreground">{ci.nome}</span>
                        <span className="text-xs text-muted-foreground w-8 text-center tabular-nums">{ci.quantidade}x</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground w-28 text-right">
                          {money(ci.valor_unitario * ci.quantidade)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-muted/50 border-t border-border">
                      <span className="text-xs text-muted-foreground">Total dos serviços:</span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {money(contratoItems.reduce((s, ci) => s + ci.valor_unitario * ci.quantidade, 0))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* descrição de cobrança */}
          {inv.descricao_cobranca && (
            <div>
              <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-2">
                Descrição para cobrança bancária
              </p>
              <div className="rounded-[14px] border border-border px-4 py-3">
                <p className="text-sm text-foreground leading-relaxed">{inv.descricao_cobranca}</p>
              </div>
            </div>
          )}

        </div>

        {/* ── footer ── */}
        <DialogFooter className="shrink-0 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button variant="outline" onClick={() => { onClose(); onVerFatura(inv) }}>
            <FileText size={14} className="mr-1.5" /> Ver Fatura
          </Button>
          {(kind === 'open' || kind === 'late') && (
            <>
              <Button
                variant="outline"
                className="text-muted-foreground hover:text-destructive hover:border-destructive"
                onClick={async () => {
                  const done = await onCancel(inv)
                  if (done) onClose()
                }}
              >
                Cancelar fatura
              </Button>
              <Button
                onClick={() => {
                  onClose()
                  onPay(inv)
                }}
              >
                Baixar pagamento
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── component ───────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const [searchParams] = useSearchParams()
  const { clientePinado } = usePinnedClient()

  const { data: rawInvoices, isLoading } = useInvoices(tenantId)
  const { data: contracts }  = useContracts(tenantId)
  const { data: clients }    = useClients(tenantId)
  const { data: policy }     = useBillingPolicy(tenantId)
  const { data: servicosRealizados } = useServicosRealizados(tenantId)
  const { data: catalogoServicos }   = useServicosAtivos(tenantId)
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const updateServico = useUpdateServicoRealizado()
  const { toast } = useToast()

  const [filter, setFilter]           = useState<FilterId>('active')
  const [filterClient, setFilterClient] = useState<string>(
    () => searchParams.get('cliente') ?? clientePinado?.id ?? 'todos'
  )
  const [q, setQ] = useState('')
  const [registrarDialog, setRegistrarDialog] = useState(false)
  const [lancamentosFilter, setLancamentosFilter] = useState<'pendentes' | 'faturados' | 'todos'>('pendentes')
  const [faturaDocDialog, setFaturaDocDialog] = useState<Invoice | null>(null)
  const [view, setView] = useState<'faturas' | 'relatorios'>('faturas')

  useEffect(() => {
    setFilterClient(clientePinado?.id ?? 'todos')
  }, [clientePinado])

  // ── dialogs ──────────────────────────────────────────────────────────────

  const [loteDialog, setLoteDialog]   = useState(false)
  const [loteComp, setLoteComp]       = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [lotePermiteReneg, setLotePermiteReneg] = useState(true)
  const [loteRowOverrides, setLoteRowOverrides] = useState<LoteRowOverrides>({})

  const loteItems = useMemo<LoteItemBase[]>(() => {
    if (!contracts || !clients) return []
    const isValidComp = /^\d{4}-\d{2}$/.test(loteComp)
    const existingComp = rawInvoices?.filter(i => i.competencia === loteComp).map(i => i.client_id) ?? []
    const policyTemplate = policy?.descricao_cobranca_padrao || TEMPLATE_DEFAULT
    return contracts
      .filter(c => c.status === 'ativo')
      .map(contract => {
        const client = clients.find(c => c.id === contract.client_id)
        const jaExiste = existingComp.includes(contract.client_id)
        const vencimento = isValidComp
          ? `${loteComp}-${String(contract.dia_vencimento).padStart(2, '0')}`
          : ''
        const templateCobranca = client?.descricao_cobranca_padrao || policyTemplate
        const descrCobrancaInicial = isValidComp ? resolveTemplate(templateCobranca, loteComp) : ''
        const servicosPendentes = (servicosRealizados ?? []).filter(
          s => s.cliente_id === contract.client_id && s.status === 'pendente_cobranca'
        )
        return {
          contractId: contract.id,
          clientId: contract.client_id,
          clientName: client?.razao_social ?? contract.client_id,
          vencimento,
          valor: contract.valor_mensal,
          jaExiste,
          templateCobranca,
          descrCobrancaInicial,
          servicosPendentes,
        }
      })
      .sort((a, b) => a.clientName.localeCompare(b.clientName, 'pt-BR'))
  }, [contracts, clients, rawInvoices, loteComp, policy, servicosRealizados])

  // inicializa overrides quando a lista muda (nova competência ou dialog abre)
  useEffect(() => {
    setLoteRowOverrides(prev => {
      const next: LoteRowOverrides = {}
      for (const item of loteItems) {
        const p = prev[item.clientId]
        next[item.clientId] = {
          selected: p?.selected ?? !item.jaExiste,
          vencimento: item.vencimento,
          valor: item.valor,
          baseValor: item.valor,
          permiteRenegociacao: p?.permiteRenegociacao ?? lotePermiteReneg,
          solicitarRevisao: p?.solicitarRevisao ?? false,
          expanded: p?.expanded ?? false,
          descricao_cobranca: item.descrCobrancaInicial,  // gerado do template do cliente/escritório
          servicosIncluidos: [],
        }
      }
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteItems])

  const handlePatchRow = (clientId: string, patch: Partial<LoteRowOverride>) => {
    setLoteRowOverrides(prev => ({
      ...prev,
      [clientId]: { ...prev[clientId], ...patch },
    }))
  }

  const handleGlobalPermiteReneg = (value: boolean) => {
    setLotePermiteReneg(value)
    setLoteRowOverrides(prev => {
      const next = { ...prev }
      for (const item of loteItems) {
        if (!item.jaExiste) next[item.clientId] = { ...next[item.clientId], permiteRenegociacao: value }
      }
      return next
    })
  }

  const createOcorrenciasLote = useCreateOcorrenciasLote()

  const [avulsaDialog, setAvulsaDialog] = useState(false)
  const [avulsaForm, setAvulsaForm] = useState({
    client_id: '',
    contract_id: '',
    competencia: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}` })(),
    vencimento: '',
    valor_original: '',
    permite_renegociacao: true,
    descricao_cobranca: '',
  })

  const avulsaContract = useMemo(
    () => contracts?.find(c => c.client_id === avulsaForm.client_id && c.status === 'ativo') ?? null,
    [avulsaForm.client_id, contracts]
  )

  const { data: avulsaItems, isLoading: avulsaItemsLoading } = useContratoItems(tenantId, avulsaContract?.id ?? '')

  const [avulsaSelectedItemIds, setAvulsaSelectedItemIds] = useState<Set<string>>(new Set())
  const [avulsaExtraItems, setAvulsaExtraItems] = useState<AvulsaExtraItem[]>([])
  const [avulsaExtraNome, setAvulsaExtraNome] = useState('')
  const [avulsaExtraValor, setAvulsaExtraValor] = useState('')
  const [avulsaItemEdits, setAvulsaItemEdits] = useState<Record<string, { nome: string; valorDisplay: string }>>({})

  // inicia todos desmarcados quando os itens carregam (novo cliente)
  useEffect(() => {
    setAvulsaSelectedItemIds(new Set())
    setAvulsaExtraItems([])
    if (avulsaItems) {
      const edits: Record<string, { nome: string; valorDisplay: string }> = {}
      avulsaItems.forEach(ci => {
        edits[ci.id] = { nome: ci.nome, valorDisplay: numToBRL(ci.valor_unitario * ci.quantidade) }
      })
      setAvulsaItemEdits(edits)
    } else {
      setAvulsaItemEdits({})
    }
  }, [avulsaItems])

  const recalcAvulsaValor = (
    selectedIds: Set<string>,
    extras: AvulsaExtraItem[],
    itemEdits: Record<string, { nome: string; valorDisplay: string }>,
  ) => {
    const contractTotal = avulsaItems
      ? avulsaItems
          .filter(ci => selectedIds.has(ci.id))
          .reduce((s, ci) => s + (parseBRL(itemEdits[ci.id]?.valorDisplay) || ci.valor_unitario * ci.quantidade), 0)
      : 0
    const extraTotal = extras.reduce((s, e) => s + e.valor, 0)
    const total = contractTotal + extraTotal
    setAvulsaForm(f => ({ ...f, valor_original: total > 0 ? numToBRL(total) : '' }))
  }

  const toggleAvulsaItem = (itemId: string, checked: boolean) => {
    const newSet = new Set(avulsaSelectedItemIds)
    if (checked) newSet.add(itemId)
    else newSet.delete(itemId)
    setAvulsaSelectedItemIds(newSet)
    recalcAvulsaValor(newSet, avulsaExtraItems, avulsaItemEdits)
  }

  const addAvulsaExtra = () => {
    const val = parseBRL(avulsaExtraValor)
    if (!avulsaExtraNome.trim() || val <= 0) return
    const newExtras = [...avulsaExtraItems, { id: uuidv4(), nome: avulsaExtraNome.trim(), valor: val }]
    setAvulsaExtraItems(newExtras)
    setAvulsaExtraNome('')
    setAvulsaExtraValor('')
    recalcAvulsaValor(avulsaSelectedItemIds, newExtras, avulsaItemEdits)
  }

  const removeAvulsaExtra = (id: string) => {
    const newExtras = avulsaExtraItems.filter(e => e.id !== id)
    setAvulsaExtraItems(newExtras)
    recalcAvulsaValor(avulsaSelectedItemIds, newExtras, avulsaItemEdits)
  }

  const handleAvulsaItemEdit = (
    itemId: string,
    field: 'nome' | 'valorDisplay',
    raw: string,
  ) => {
    const value = field === 'valorDisplay' ? inputToBRL(raw) : raw
    const newEdits = { ...avulsaItemEdits, [itemId]: { ...(avulsaItemEdits[itemId] ?? { nome: '', valorDisplay: '' }), [field]: value } }
    setAvulsaItemEdits(newEdits)
    if (field === 'valorDisplay' && avulsaSelectedItemIds.has(itemId)) {
      recalcAvulsaValor(avulsaSelectedItemIds, avulsaExtraItems, newEdits)
    }
  }

  const handleAvulsaClientChange = (clientId: string) => {
    const contract = contracts?.find(c => c.client_id === clientId && c.status === 'ativo') ?? null
    const client   = clients?.find(c => c.id === clientId)
    const tpl = client?.descricao_cobranca_padrao || policy?.descricao_cobranca_padrao || TEMPLATE_DEFAULT
    setAvulsaForm(f => {
      const isValidComp = /^\d{4}-\d{2}$/.test(f.competencia)
      return {
        ...f,
        client_id: clientId,
        contract_id: contract?.id ?? '',
        valor_original: contract ? numToBRL(contract.valor_mensal) : f.valor_original,
        vencimento: contract && isValidComp
          ? `${f.competencia}-${String(contract.dia_vencimento).padStart(2, '0')}`
          : f.vencimento,
        descricao_cobranca: isValidComp ? resolveTemplate(tpl, f.competencia) : '',
      }
    })
  }

  const handleAvulsaCompChange = (comp: string) => {
    setAvulsaForm(f => {
      const contract = contracts?.find(c => c.client_id === f.client_id && c.status === 'ativo') ?? null
      const client   = clients?.find(c => c.id === f.client_id)
      const tpl = client?.descricao_cobranca_padrao || policy?.descricao_cobranca_padrao || TEMPLATE_DEFAULT
      const isValidComp = /^\d{4}-\d{2}$/.test(comp)
      return {
        ...f,
        competencia: comp,
        vencimento: contract && isValidComp
          ? `${comp}-${String(contract.dia_vencimento).padStart(2, '0')}`
          : f.vencimento,
        descricao_cobranca: isValidComp ? resolveTemplate(tpl, comp) : f.descricao_cobranca,
      }
    })
  }

  const handleAvulsaDescrRestore = () => {
    setAvulsaForm(f => {
      if (!/^\d{4}-\d{2}$/.test(f.competencia)) return f
      const client = clients?.find(c => c.id === f.client_id)
      const tpl = client?.descricao_cobranca_padrao || policy?.descricao_cobranca_padrao || TEMPLATE_DEFAULT
      return { ...f, descricao_cobranca: resolveTemplate(tpl, f.competencia) }
    })
  }

  const [payDialog, setPayDialog]     = useState(false)
  const [payTarget, setPayTarget]     = useState<Invoice | null>(null)
  const [payDate, setPayDate]         = useState(() => new Date().toISOString().split('T')[0])
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null)

  // ── derived ───────────────────────────────────────────────────────────────

  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const clientName = (id: string) =>
    clients?.find((c) => c.id === id)?.razao_social ?? id

  const allInvoices = [...(rawInvoices ?? [])].sort(
    (a, b) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime()
  )

  function getUpdated(inv: Invoice): number {
    if (inv.status !== 'vencida' || !policy) return inv.valor_original
    return calcularEncargos(inv, policy, today).total
  }

  function getRef(inv: Invoice): string {
    if (inv.origem === 'renegociacao') return 'Renegociação'
    if (inv.origem === 'avulsa') return 'Avulso'
    const [year, month] = inv.competencia.split('-')
    return `Comp. ${month}/${year}`
  }

  // ── KPI partitions (over all invoices, ignoring current filters) ──────────

  const lateInvs = allInvoices.filter((i) => i.status === 'vencida')
  const openInvs = allInvoices.filter((i) => i.status === 'aberta')
  const dealInvs = allInvoices.filter((i) => i.status === 'renegociada')

  const sum = (arr: Invoice[], fn: (i: Invoice) => number) =>
    arr.reduce((s, i) => s + fn(i), 0)

  const tileLate = sum(lateInvs, getUpdated)
  const tileOpen = sum(openInvs, (i) => i.valor_original)
  const tilePaid = sum(
    allInvoices.filter((i) => i.status === 'paga' && i.competencia === currentMonth),
    (i) => i.valor_original
  )
  const tileDeal = sum(dealInvs, (i) => i.valor_original)

  const pendentesCobranca = (servicosRealizados ?? []).filter(s => s.status === 'pendente_cobranca')
  const tilePendentes = pendentesCobranca.reduce((acc, s) => acc + s.valor, 0)

  const oldestDays = lateInvs.length
    ? Math.max(...lateInvs.map((i) => differenceInDays(today, parseISO(i.vencimento))))
    : 0

  // ── tabs (respect client filter for counts) ───────────────────────────────

  const forTabs = allInvoices.filter((inv) =>
    filterClient === 'todos' || inv.client_id === filterClient
  )

  const tabDefs: { id: FilterId; label: string; count: number }[] = [
    { id: 'active', label: 'Em aberto',  count: forTabs.filter(i => i.status === 'vencida' || i.status === 'aberta' || i.status === 'renegociada').length },
    { id: 'late',   label: 'Em atraso',  count: forTabs.filter(i => i.status === 'vencida').length },
    { id: 'open',   label: 'A vencer',   count: forTabs.filter(i => i.status === 'aberta').length },
    { id: 'deal',   label: 'Negociadas', count: forTabs.filter(i => i.status === 'renegociada').length },
    { id: 'paid',   label: 'Pagas',      count: forTabs.filter(i => i.status === 'paga').length },
    { id: 'all',    label: 'Todas',      count: forTabs.length },
  ]

  // ── filtered rows ────────────────────────────────────────────────────────

  const needle = q.trim().toLowerCase()
  const shown = allInvoices.filter((inv) => {
    if (filter === 'active' && inv.status !== 'vencida' && inv.status !== 'aberta' && inv.status !== 'renegociada') return false
    if (filter === 'late'   && inv.status !== 'vencida')     return false
    if (filter === 'open'   && inv.status !== 'aberta')      return false
    if (filter === 'paid'   && inv.status !== 'paga')        return false
    if (filter === 'deal'   && inv.status !== 'renegociada') return false
    if (filterClient !== 'todos' && inv.client_id !== filterClient) return false
    if (needle) {
      const hay = (clientName(inv.client_id) + ' ' + inv.competencia + ' ' + getRef(inv)).toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })

  // ── handlers ─────────────────────────────────────────────────────────────

  const gerarLote = async () => {
    const toGenerate = loteItems.filter(i => !i.jaExiste && loteRowOverrides[i.clientId]?.selected)
    let count = 0
    let servicosCount = 0
    for (const item of toGenerate) {
      const ov = loteRowOverrides[item.clientId]!
      const invoiceId = uuidv4()
      const nova: Invoice = {
        id: invoiceId,
        tenant_id: tenantId,
        client_id: item.clientId,
        contract_id: item.contractId,
        competencia: loteComp,
        vencimento: ov.vencimento,
        valor_original: ov.valor,
        status: 'aberta',
        origem: 'contrato',
        permite_renegociacao: ov.permiteRenegociacao,
        descricao_cobranca: ov.descricao_cobranca.trim() || undefined,
      }
      await createInvoice.mutateAsync(nova)
      count++

      // Marca serviços incluídos como faturados
      for (const servicoId of ov.servicosIncluidos) {
        await updateServico.mutateAsync({
          id: servicoId,
          data: { status: 'incluido_fatura', invoice_id: invoiceId },
        })
        servicosCount++
      }
    }

    const revisaoIds = loteItems
      .filter(i => !i.jaExiste && loteRowOverrides[i.clientId]?.solicitarRevisao)
      .map(i => i.clientId)

    if (revisaoIds.length > 0) {
      const hoje = new Date()
      const dataHoje = hoje.toISOString().split('T')[0]
      const dataPrev = new Date(hoje)
      dataPrev.setDate(dataPrev.getDate() + 7)
      const dataPrevStr = dataPrev.toISOString().split('T')[0]
      await createOcorrenciasLote.mutateAsync({
        loteId: uuidv4(),
        clienteIds: revisaoIds,
        ocorrenciaBase: {
          tenant_id: tenantId,
          titulo: `Revisão de valores contratuais — ${loteComp}`,
          descricao: `Solicitação gerada no lote mensal ${loteComp}. Verificar se os valores do contrato precisam ser atualizados antes do próximo faturamento.`,
          origem: 'rotina',
          categoria: 'contabil',
          data_solicitacao: dataHoje,
          data_prevista: dataPrevStr,
          status: 'pendente',
          criado_por: currentUser?.id ?? '',
          criado_em: new Date().toISOString(),
        },
        tarefas: [{
          tenant_id: tenantId,
          ordem: 1,
          nome: 'Revisar valores do contrato',
          descricao: 'Verificar se os valores mensais precisam de atualização contratual.',
          data_prevista: dataPrevStr,
          status: 'pendente',
          checklist_progresso: [],
          documentos_config: [],
        }],
      })
    }

    const msgs: string[] = [`${count} fatura${count !== 1 ? 's' : ''} gerada${count !== 1 ? 's' : ''} para ${loteComp}`]
    if (servicosCount > 0) msgs.push(`${servicosCount} lançamento${servicosCount !== 1 ? 's' : ''} incluído${servicosCount !== 1 ? 's' : ''}`)
    if (revisaoIds.length > 0) msgs.push(`${revisaoIds.length} ocorrência${revisaoIds.length !== 1 ? 's' : ''} de revisão criada${revisaoIds.length !== 1 ? 's' : ''}`)
    toast({ title: 'Lote gerado', description: msgs.join(' · ') })
    setLoteDialog(false)
  }

  const createAvulsa = async () => {
    const { client_id, contract_id, competencia, vencimento, valor_original, permite_renegociacao, descricao_cobranca } = avulsaForm
    if (!client_id || !competencia || !vencimento || !valor_original) return
    try {
      await createInvoice.mutateAsync({
        id: uuidv4(), tenant_id: tenantId, client_id,
        contract_id: contract_id || undefined,
        competencia, vencimento,
        valor_original: parseBRL(valor_original),
        status: 'aberta', origem: 'avulsa', permite_renegociacao,
        descricao_cobranca: descricao_cobranca.trim() || undefined,
      })
      toast({ title: 'Fatura avulsa criada' })
      setAvulsaDialog(false)
      setAvulsaSelectedItemIds(new Set())
      setAvulsaExtraItems([])
      setAvulsaExtraNome('')
      setAvulsaExtraValor('')
      setAvulsaItemEdits({})
      const n = new Date()
      setAvulsaForm({
        client_id: '', contract_id: '',
        competencia: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`,
        vencimento: '', valor_original: '', permite_renegociacao: true, descricao_cobranca: '',
      })
    } catch { toast({ title: 'Erro', variant: 'destructive' }) }
  }

  const confirmPay = async () => {
    if (!payTarget) return
    try {
      await updateInvoice.mutateAsync({ id: payTarget.id, data: { status: 'paga' } })
      toast({ title: 'Fatura baixada como paga' })
      setPayDialog(false)
    } catch { toast({ title: 'Erro', variant: 'destructive' }) }
  }

  const cancelInvoice = async (inv: Invoice): Promise<boolean> => {
    if (!confirm('Cancelar esta fatura?')) return false
    try {
      await updateInvoice.mutateAsync({ id: inv.id, data: { status: 'cancelada' } })
      toast({ title: 'Fatura cancelada' })
      return true
    } catch { toast({ title: 'Erro', variant: 'destructive' }); return false }
  }

  if (isLoading) return <PageLoader />

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* ── header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[28px] font-bold tracking-tight leading-none">Financeiro</h1>
          <p className="m-0 text-[15px] text-muted-foreground">Gestão de faturas e cobranças</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* toggle de view */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            {([
              { id: 'faturas',    label: 'Faturas' },
              { id: 'relatorios', label: 'Relatórios' },
            ] as const).map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`px-4 py-2 text-sm font-bold transition-colors ${
                  view === v.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {view === 'faturas' && (
            <>
              <Button variant="outline" onClick={() => setRegistrarDialog(true)}>
                <Wrench className="mr-2 h-4 w-4" />
                Registrar Serviço
                {pendentesCobranca.length > 0 && (
                  <span className="ml-1.5 h-5 min-w-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {pendentesCobranca.length}
                  </span>
                )}
              </Button>
              <Button variant="outline" onClick={() => setLoteDialog(true)}>
                <Receipt className="mr-2 h-4 w-4" />
                Gerar Lote Mensal
              </Button>
              <Button onClick={() => setAvulsaDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Fatura Avulsa
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ══════════════════ VIEW: RELATÓRIOS ══════════════════════════════ */}
      {view === 'relatorios' && (
        <RelatoriosPanel
          invoices={allInvoices}
          clients={clients ?? []}
          servicosRealizados={servicosRealizados ?? []}
          policy={policy}
        />
      )}

      {/* ══════════════════ VIEW: FATURAS ══════════════════════════════════ */}
      {view === 'faturas' && <>

      {/* ── KPI cards estilo Google Finance ────────────────────────────── */}
      <section aria-label="Resumo financeiro" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

        {/* Em atraso */}
        <button
          type="button"
          onClick={() => setFilter('late')}
          className={`group relative flex flex-col gap-1 p-4 rounded-2xl text-left border transition-all overflow-hidden ${
            filter === 'late'
              ? 'bg-red-950/20 border-red-500/50 ring-1 ring-red-500/30'
              : lateInvs.length > 0
                ? 'bg-card border-border hover:border-red-400/40 hover:bg-red-950/10'
                : 'bg-card border-border hover:bg-muted/30'
          }`}
        >
          <span className={`text-[10px] font-extrabold tracking-widest uppercase leading-none ${
            lateInvs.length > 0 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'
          }`}>Em atraso</span>

          <span className="text-[20px] font-extrabold tabular-nums leading-tight text-foreground">
            {lateInvs.length > 0 ? money(tileLate) : '—'}
          </span>

          <span className={`text-[11px] font-semibold flex items-center gap-1 ${
            lateInvs.length > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }`}>
            {lateInvs.length > 0 ? (
              <><span className="text-[10px]">▲</span>{lateInvs.length} fat. · {oldestDays}d</>
            ) : (
              <><span>✓</span>Nenhuma</>
            )}
          </span>

          {/* mini sparkline decorativa */}
          <svg viewBox="0 0 120 28" className="w-full h-7 mt-1 opacity-20" preserveAspectRatio="none" aria-hidden>
            {lateInvs.length > 0
              ? <path d="M0 22 Q20 18 40 20 Q60 22 80 14 Q100 6 120 4" stroke="rgb(239 68 68)" strokeWidth="2" fill="none" strokeLinecap="round"/>
              : <path d="M0 14 Q30 16 60 13 Q90 10 120 12" stroke="rgb(34 197 94)" strokeWidth="2" fill="none" strokeLinecap="round"/>
            }
          </svg>

          <div className={`absolute bottom-0 left-0 right-0 h-[3px] transition-all ${
            lateInvs.length > 0
              ? filter === 'late' ? 'bg-red-500' : 'bg-red-500/40 group-hover:bg-red-500/70'
              : 'bg-green-500/30'
          }`} />
        </button>

        {/* A receber */}
        <button
          type="button"
          onClick={() => setFilter('open')}
          className={`group relative flex flex-col gap-1 p-4 rounded-2xl text-left border transition-all overflow-hidden ${
            filter === 'open'
              ? 'bg-muted border-primary/50 ring-1 ring-primary/30'
              : 'bg-card border-border hover:border-amber-400/40 hover:bg-amber-950/10'
          }`}
        >
          <span className="text-[10px] font-extrabold tracking-widest uppercase leading-none text-muted-foreground">A receber</span>

          <span className="text-[20px] font-extrabold tabular-nums leading-tight text-foreground">{money(tileOpen)}</span>

          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span className="text-[10px]">→</span>{openInvs.length} em aberto
          </span>

          <svg viewBox="0 0 120 28" className="w-full h-7 mt-1 opacity-20" preserveAspectRatio="none" aria-hidden>
            <path d="M0 16 Q30 14 60 15 Q90 16 120 13" stroke="rgb(245 158 11)" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>

          <div className={`absolute bottom-0 left-0 right-0 h-[3px] transition-all ${
            filter === 'open' ? 'bg-amber-500' : 'bg-amber-500/30 group-hover:bg-amber-500/60'
          }`} />
        </button>

        {/* Pago no mês */}
        <button
          type="button"
          onClick={() => setFilter('paid')}
          className={`group relative flex flex-col gap-1 p-4 rounded-2xl text-left border transition-all overflow-hidden ${
            filter === 'paid'
              ? 'bg-green-950/20 border-green-500/50 ring-1 ring-green-500/30'
              : 'bg-card border-border hover:border-green-400/40 hover:bg-green-950/10'
          }`}
        >
          <span className="text-[10px] font-extrabold tracking-widest uppercase leading-none text-muted-foreground">Pago no mês</span>

          <span className="text-[20px] font-extrabold tabular-nums leading-tight text-foreground">{money(tilePaid)}</span>

          <span className="text-[11px] font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
            <span className="text-[10px]">▼</span>
            {allInvoices.filter(i => i.status === 'paga' && i.competencia === currentMonth).length} fat. · {currentMonth}
          </span>

          <svg viewBox="0 0 120 28" className="w-full h-7 mt-1 opacity-20" preserveAspectRatio="none" aria-hidden>
            <path d="M0 20 Q20 16 40 12 Q70 6 90 8 Q110 10 120 7" stroke="rgb(34 197 94)" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>

          <div className={`absolute bottom-0 left-0 right-0 h-[3px] transition-all ${
            filter === 'paid' ? 'bg-green-500' : 'bg-green-500/30 group-hover:bg-green-500/60'
          }`} />
        </button>

        {/* Em acordo */}
        <button
          type="button"
          onClick={() => setFilter('deal')}
          className={`group relative flex flex-col gap-1 p-4 rounded-2xl text-left border transition-all overflow-hidden ${
            filter === 'deal'
              ? 'bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/30'
              : 'bg-card border-border hover:border-blue-400/40 hover:bg-blue-950/10'
          }`}
        >
          <span className="text-[10px] font-extrabold tracking-widest uppercase leading-none text-blue-600 dark:text-blue-400">Em acordo</span>

          <span className="text-[20px] font-extrabold tabular-nums leading-tight text-foreground">
            {dealInvs.length > 0 ? money(tileDeal) : '—'}
          </span>

          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <span className="text-[10px]">↔</span>{dealInvs.length} negociada{dealInvs.length !== 1 ? 's' : ''}
          </span>

          <svg viewBox="0 0 120 28" className="w-full h-7 mt-1 opacity-20" preserveAspectRatio="none" aria-hidden>
            <path d="M0 15 Q40 12 60 14 Q80 16 120 13" stroke="rgb(59 130 246)" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>

          <div className={`absolute bottom-0 left-0 right-0 h-[3px] transition-all ${
            filter === 'deal' ? 'bg-blue-500' : 'bg-blue-500/30 group-hover:bg-blue-500/60'
          }`} />
        </button>

        {/* Pendentes de cobrança */}
        <button
          type="button"
          onClick={() => setRegistrarDialog(true)}
          className={`group relative flex flex-col gap-1 p-4 rounded-2xl text-left border transition-all overflow-hidden ${
            pendentesCobranca.length > 0
              ? 'bg-card border-border hover:border-amber-400/40 hover:bg-amber-950/10'
              : 'bg-card border-border hover:bg-muted/30'
          }`}
        >
          <span className={`text-[10px] font-extrabold tracking-widest uppercase leading-none ${
            pendentesCobranca.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
          }`}>Pendentes</span>

          <span className={`text-[20px] font-extrabold tabular-nums leading-tight ${
            pendentesCobranca.length > 0 ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {pendentesCobranca.length > 0 ? money(tilePendentes) : '—'}
          </span>

          <span className={`text-[11px] font-semibold flex items-center gap-1 ${
            pendentesCobranca.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
          }`}>
            {pendentesCobranca.length > 0 ? (
              <><span className="text-[10px]">↗</span>{pendentesCobranca.length} serviço{pendentesCobranca.length !== 1 ? 's' : ''}</>
            ) : (
              'Nenhum pendente'
            )}
          </span>

          <svg viewBox="0 0 120 28" className="w-full h-7 mt-1 opacity-20" preserveAspectRatio="none" aria-hidden>
            {pendentesCobranca.length > 0
              ? <path d="M0 18 Q30 16 60 12 Q90 8 120 6" stroke="rgb(245 158 11)" strokeWidth="2" fill="none" strokeLinecap="round"/>
              : <path d="M0 14 Q60 15 120 14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            }
          </svg>

          <div className={`absolute bottom-0 left-0 right-0 h-[3px] transition-all ${
            pendentesCobranca.length > 0
              ? 'bg-amber-500/40 group-hover:bg-amber-500/70'
              : 'bg-border'
          }`} />
        </button>

      </section>

      {/* ── invoice table ───────────────────────────────────────────────── */}
      <section aria-label="Lista de faturas" className="bg-card border border-border rounded-[20px] overflow-hidden">

        {/* filter bar */}
        <div className="flex flex-wrap items-center gap-3 p-5 border-b border-border">

          {/* status tabs */}
          <div role="group" aria-label="Filtrar por situação" className="flex flex-wrap gap-2">
            {tabDefs.map((t) => {
              const on = t.id === filter
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(t.id)}
                  className="inline-flex items-center gap-2 min-h-10 px-3.5 rounded-full text-sm font-bold cursor-pointer transition-all"
                  style={
                    on
                      ? { border: '2px solid hsl(var(--primary))', background: 'hsl(var(--primary))', color: '#fff' }
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

          {/* client + search */}
          <div className="flex flex-wrap gap-2 ml-auto">
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-48 h-10">
                <SelectValue placeholder="Todos clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos clientes</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar"
                className="min-h-10 pl-9 pr-3 w-44 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <div role="table" aria-label="Faturas" style={{ minWidth: 840 }}>

            {/* header row */}
            <div
              role="row"
              className="grid gap-4 px-6 py-3 bg-muted border-b border-border text-xs font-extrabold tracking-widest uppercase text-muted-foreground"
              style={{ gridTemplateColumns: COL }}
            >
              <div role="columnheader">Cliente</div>
              <div role="columnheader">Vencimento</div>
              <div role="columnheader">Valor</div>
              <div role="columnheader">Situação</div>
              <div role="columnheader" className="text-right">Ações</div>
            </div>

            {/* data rows */}
            {shown.map((inv) => {
              const kind = statusToKind(inv.status)
              const badge = BADGE[kind]
              const updated = getUpdated(inv)
              const daysLate  = kind === 'late' ? differenceInDays(today, parseISO(inv.vencimento)) : 0
              const daysUntil = kind === 'open' ? differenceInDays(parseISO(inv.vencimento), today) : 0

              let subText = ''
              let subCls = 'text-muted-foreground'
              if (kind === 'late') { subText = `${daysLate} dia${daysLate !== 1 ? 's' : ''} de atraso`; subCls = 'text-red-600 dark:text-red-400' }
              if (kind === 'open') { subText = daysUntil === 0 ? 'Vence hoje' : `Vence em ${daysUntil} dias` }
              if (kind === 'paid') { subText = `Venc. ${format(parseISO(inv.vencimento), 'dd/MM/yyyy')}` }
              if (kind === 'deal') { subText = 'Incluída no acordo' }

              return (
                <div
                  key={inv.id}
                  role="row"
                  onClick={() => setDetailInvoice(inv)}
                  className={`grid gap-4 items-center px-6 py-3.5 border-b border-border last:border-0 cursor-pointer transition-colors ${
                    kind === 'late'
                      ? 'border-l-2 border-l-red-400 dark:border-l-red-700 bg-card dark:bg-red-950/10 hover:bg-red-50/60 dark:hover:bg-red-950/20'
                      : 'bg-card hover:bg-muted/30'
                  }`}
                  style={{ gridTemplateColumns: COL }}
                >
                  {/* Cliente */}
                  <div role="cell" className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[15px] font-extrabold text-foreground truncate">{clientName(inv.client_id)}</span>
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
                        c/ enc. {money(updated)}
                      </span>
                    )}
                  </div>

                  {/* Situação */}
                  <div role="cell">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </div>

                  {/* Ações */}
                  <div role="cell" className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {(kind === 'open' || kind === 'late') && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPayTarget(inv)
                            setPayDate(new Date().toISOString().split('T')[0])
                            setPayDialog(true)
                          }}
                          className="min-h-9 px-3.5 rounded-lg border-0 bg-primary text-primary-foreground text-sm font-bold cursor-pointer"
                        >
                          Baixar
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelInvoice(inv)}
                          className="min-h-9 px-3 rounded-lg border border-border bg-card text-muted-foreground text-sm font-semibold cursor-pointer hover:text-foreground transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                    {kind === 'paid' && (
                      <span className="text-xs font-semibold text-green-700 dark:text-green-400 px-2">Paga ✓</span>
                    )}
                    {kind === 'deal' && (
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 px-2">No acordo</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFaturaDocDialog(inv) }}
                      title="Ver documento da fatura"
                      className="min-h-9 w-9 rounded-lg border border-border bg-card text-muted-foreground text-sm cursor-pointer hover:text-primary hover:border-primary transition-colors flex items-center justify-center"
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

      {/* ── Lançamentos / Serviços Realizados ──────────────────────────── */}
      <section aria-label="Lançamentos pendentes de cobrança" className="bg-card border border-border rounded-[20px] overflow-hidden">

        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <ClipboardList size={18} className="text-muted-foreground" />
            <h2 className="text-[15px] font-bold text-foreground">Lançamentos de serviços</h2>
            {pendentesCobranca.length > 0 && (
              <span className="h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                {pendentesCobranca.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* filter tabs */}
            <div className="flex rounded-xl border border-border overflow-hidden">
              {([
                { id: 'pendentes', label: 'Pendentes' },
                { id: 'faturados', label: 'Faturados' },
                { id: 'todos',     label: 'Todos' },
              ] as const).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLancamentosFilter(t.id)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    lancamentosFilter === t.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => setRegistrarDialog(true)}>
              <Plus size={14} className="mr-1.5" /> Registrar
            </Button>
          </div>
        </div>

        {/* tabela */}
        {(() => {
          const lancamentos = (servicosRealizados ?? []).filter(s => {
            if (lancamentosFilter === 'pendentes') return s.status === 'pendente_cobranca'
            if (lancamentosFilter === 'faturados') return s.status === 'incluido_fatura'
            return s.status !== 'cancelado'
          })

          if (lancamentos.length === 0) {
            return (
              <div className="px-6 py-10 text-center">
                {lancamentosFilter === 'pendentes' ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 size={32} className="text-green-500 dark:text-green-400" />
                    <p className="text-sm font-semibold text-foreground">Nenhum lançamento pendente</p>
                    <p className="text-xs text-muted-foreground">Todos os serviços realizados já foram faturados.</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
                )}
              </div>
            )
          }

          return (
            <div className="overflow-x-auto">
              <div style={{ minWidth: 700 }}>
                {/* header */}
                <div
                  className="grid gap-4 px-6 py-3 bg-muted border-b border-border text-xs font-extrabold tracking-widest uppercase text-muted-foreground"
                  style={{ gridTemplateColumns: 'minmax(180px,2fr) minmax(140px,1.5fr) 110px 120px 110px 130px' }}
                >
                  <div>Cliente</div>
                  <div>Serviço</div>
                  <div>Competência</div>
                  <div>Execução</div>
                  <div>Valor</div>
                  <div>Situação</div>
                </div>
                {lancamentos
                  .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
                  .map(s => {
                    const clienteNome = clients?.find(c => c.id === s.cliente_id)?.razao_social ?? s.cliente_id
                    const [ano, mes] = s.competencia.split('-')
                    const compLabel = `${mes}/${ano}`
                    const execLabel = s.data_execucao
                      ? format(parseISO(s.data_execucao), 'dd/MM/yyyy')
                      : '—'

                    return (
                      <div
                        key={s.id}
                        className="grid gap-4 items-center px-6 py-3.5 border-b border-border last:border-0 bg-card hover:bg-muted/20 transition-colors"
                        style={{ gridTemplateColumns: 'minmax(180px,2fr) minmax(140px,1.5fr) 110px 120px 110px 130px' }}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[14px] font-bold text-foreground truncate">{clienteNome}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[13px] font-medium text-foreground truncate">{s.nome}</span>
                          {s.descricao && (
                            <span className="text-[11px] text-muted-foreground truncate">{s.descricao}</span>
                          )}
                        </div>
                        <span className="text-[13px] tabular-nums text-foreground">{compLabel}</span>
                        <span className="text-[13px] tabular-nums text-muted-foreground">{execLabel}</span>
                        <span className="text-[14px] font-bold tabular-nums text-foreground">{money(s.valor)}</span>
                        <div className="flex items-center gap-2">
                          {s.status === 'pendente_cobranca' && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                <AlertCircle size={10} /> Pendente
                              </span>
                              <button
                                type="button"
                                title="Faturar como avulsa"
                                onClick={() => {
                                  setAvulsaForm(f => ({
                                    ...f,
                                    client_id: s.cliente_id,
                                    contract_id: '',
                                    competencia: s.competencia,
                                    vencimento: '',
                                    valor_original: s.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                    permite_renegociacao: true,
                                    descricao_cobranca: '',
                                  }))
                                  setAvulsaDialog(true)
                                }}
                                className="h-7 w-7 rounded-lg flex items-center justify-center border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                              >
                                <Receipt size={13} />
                              </button>
                              <button
                                type="button"
                                title="Cancelar lançamento"
                                onClick={async () => {
                                  if (!confirm(`Cancelar o lançamento "${s.nome}"?`)) return
                                  await updateServico.mutateAsync({ id: s.id, data: { status: 'cancelado' } })
                                  toast({ title: 'Lançamento cancelado' })
                                }}
                                className="h-7 w-7 rounded-lg flex items-center justify-center border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </>
                          )}
                          {s.status === 'incluido_fatura' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
                              <CheckCircle2 size={10} /> Faturado
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          )
        })()}
      </section>

      </>}{/* fim view faturas */}

      {/* ── Fatura Documento Dialog ────────────────────────────────────── */}
      {faturaDocDialog && (
        <FaturaDocumentoDialog
          open={!!faturaDocDialog}
          onClose={() => setFaturaDocDialog(null)}
          invoice={faturaDocDialog}
          tenantId={tenantId}
        />
      )}

      {/* ── Registrar Serviço Dialog ───────────────────────────────────── */}
      <RegistrarServicoDialog
        open={registrarDialog}
        onClose={() => setRegistrarDialog(false)}
        tenantId={tenantId}
        userId={currentUser?.id ?? ''}
        clients={clients ?? []}
        servicos={catalogoServicos ?? []}
      />

      {/* ── Invoice Detail Dialog ───────────────────────────────────────── */}
      {detailInvoice && (
        <InvoiceDetailDialog
          inv={detailInvoice}
          tenantId={tenantId}
          clientName={clientName}
          getRef={getRef}
          policy={policy}
          today={today}
          onClose={() => setDetailInvoice(null)}
          onPay={(inv) => {
            setPayTarget(inv)
            setPayDate(new Date().toISOString().split('T')[0])
            setPayDialog(true)
          }}
          onCancel={cancelInvoice}
          onVerFatura={(inv) => { setDetailInvoice(null); setFaturaDocDialog(inv) }}
        />
      )}

      {/* ── Lote Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={loteDialog} onOpenChange={setLoteDialog}>
        <DialogContent className="max-w-[860px] w-full">
          <DialogHeader>
            <DialogTitle>Gerar Lote Mensal</DialogTitle>
          </DialogHeader>

          {/* Config row */}
          <div className="flex flex-wrap items-center gap-3 pt-1 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Label htmlFor="lote-comp" className="whitespace-nowrap text-sm font-semibold">Competência</Label>
              <Input
                id="lote-comp"
                placeholder="2025-07"
                value={loteComp}
                onChange={(e) => setLoteComp(e.target.value)}
                className="w-32 h-9"
              />
            </div>
            <div className="flex items-center gap-3 ml-auto rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium leading-none">Permite renegociação (padrão)</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Aplica a todos · editável por linha</p>
              </div>
              <Switch checked={lotePermiteReneg} onCheckedChange={handleGlobalPermiteReneg} />
            </div>
          </div>

          {/* Preview table */}
          <div className="rounded-[14px] border border-border overflow-hidden">

            {/* Table header */}
            <div
              className="grid items-center gap-2 px-4 py-2.5 bg-muted border-b border-border text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground"
              style={{ gridTemplateColumns: COL_LOTE }}
            >
              <div>
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-primary"
                  checked={
                    loteItems.filter(i => !i.jaExiste).length > 0 &&
                    loteItems.filter(i => !i.jaExiste).every(i => loteRowOverrides[i.clientId]?.selected)
                  }
                  onChange={(e) => {
                    setLoteRowOverrides(prev => {
                      const next = { ...prev }
                      for (const item of loteItems) {
                        if (!item.jaExiste) next[item.clientId] = { ...next[item.clientId], selected: e.target.checked }
                      }
                      return next
                    })
                  }}
                />
              </div>
              <div>Cliente</div>
              <div>Vencimento</div>
              <div>Valor</div>
              <div title="Permite renegociação" className="text-center">Reneg.</div>
              <div title="Solicitar revisão de contrato" className="text-center">Revisão</div>
              <div />
            </div>

            {/* Table body */}
            <div className="max-h-72 overflow-y-auto">
              {!contracts || !clients ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Carregando contratos...
                </div>
              ) : loteItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum contrato ativo encontrado.
                </div>
              ) : loteItems.map(item => {
                const ov = loteRowOverrides[item.clientId]
                if (!ov) return null
                return (
                  <LoteRowItem
                    key={item.clientId}
                    tenantId={tenantId}
                    loteComp={loteComp}
                    item={item}
                    ov={ov}
                    onChange={(patch) => handlePatchRow(item.clientId, patch)}
                  />
                )
              })}
            </div>
          </div>

          {/* Summary */}
          {(() => {
            const selected = loteItems.filter(i => !i.jaExiste && loteRowOverrides[i.clientId]?.selected)
            const revisaoCount = loteItems.filter(i => !i.jaExiste && loteRowOverrides[i.clientId]?.solicitarRevisao).length
            const total = selected.reduce((s, i) => s + (loteRowOverrides[i.clientId]?.valor ?? i.valor), 0)
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {selected.length === 0
                      ? 'Nenhuma fatura selecionada'
                      : `${selected.length} fatura${selected.length !== 1 ? 's' : ''} selecionada${selected.length !== 1 ? 's' : ''}`}
                  </span>
                  <span className="text-base font-extrabold tabular-nums text-foreground">{money(total)}</span>
                </div>
                {revisaoCount > 0 && (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-2.5">
                    <Flag size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                      {revisaoCount} cliente{revisaoCount !== 1 ? 's' : ''} marcado{revisaoCount !== 1 ? 's' : ''} para revisão — será criada uma ocorrência no financeiro
                    </span>
                  </div>
                )}
              </div>
            )
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLoteDialog(false)}>Cancelar</Button>
            <Button
              onClick={gerarLote}
              disabled={
                !loteItems.some(i => !i.jaExiste && loteRowOverrides[i.clientId]?.selected) ||
                createInvoice.isPending ||
                createOcorrenciasLote.isPending
              }
            >
              <Receipt className="mr-2 h-4 w-4" />
              {(() => {
                const n = loteItems.filter(i => !i.jaExiste && loteRowOverrides[i.clientId]?.selected).length
                return `Gerar ${n > 0 ? n + ' ' : ''}Fatura${n !== 1 ? 's' : ''}`
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Avulsa Dialog ───────────────────────────────────────────────── */}
      <Dialog open={avulsaDialog} onOpenChange={setAvulsaDialog}>
        <DialogContent className="max-w-2xl w-full flex flex-col" style={{ maxHeight: '90vh' }}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Fatura Avulsa</DialogTitle>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-1 px-0.5">

            {/* Seleção de cliente */}
            <div className="space-y-1.5 pb-3 border-b border-border">
              <Label>Cliente</Label>
              <Select value={avulsaForm.client_id} onValueChange={handleAvulsaClientChange}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
                <SelectContent>
                  {clients?.filter(c => c.status === 'ativo').map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {avulsaForm.client_id && avulsaContract && (
                <p className="text-xs text-green-700 dark:text-green-400">
                  Contrato ativo encontrado — vencimento e valor preenchidos automaticamente. Edite se necessário.
                </p>
              )}
              {avulsaForm.client_id && !avulsaContract && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Sem contrato ativo — preencha os campos manualmente.
                </p>
              )}
            </div>

            {/* Campos principais em grade */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="av-comp">Competência</Label>
                <Input
                  id="av-comp"
                  placeholder="2026-10"
                  value={avulsaForm.competencia}
                  onChange={(e) => handleAvulsaCompChange(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="av-venc">Vencimento</Label>
                <Input
                  id="av-venc"
                  type="date"
                  value={avulsaForm.vencimento}
                  onChange={(e) => setAvulsaForm(f => ({ ...f, vencimento: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="av-valor">Valor (R$)</Label>
                <Input
                  id="av-valor"
                  type="text"
                  inputMode="numeric"
                  value={avulsaForm.valor_original}
                  onChange={(e) => setAvulsaForm(f => ({ ...f, valor_original: inputToBRL(e.target.value) }))}
                  className="h-9 text-right tabular-nums"
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Permite renegociação</Label>
                <div className="flex items-center h-9 gap-3 rounded-lg border border-border px-3">
                  <span className="text-sm text-muted-foreground flex-1">
                    {avulsaForm.permite_renegociacao ? 'Sim' : 'Não — quitação à vista'}
                  </span>
                  <Switch
                    checked={avulsaForm.permite_renegociacao}
                    onCheckedChange={(v) => setAvulsaForm(f => ({ ...f, permite_renegociacao: v }))}
                  />
                </div>
              </div>
            </div>

            {/* Serviços + itens avulsos — painel unificado */}
            {avulsaForm.client_id && (
              <div className="rounded-[14px] border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted border-b border-border flex items-center justify-between">
                  <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">
                    Serviços
                  </p>
                  {avulsaItems && avulsaItems.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => {
                          const newSet = new Set(avulsaItems.map(ci => ci.id))
                          setAvulsaSelectedItemIds(newSet)
                          recalcAvulsaValor(newSet, avulsaExtraItems, avulsaItemEdits)
                        }}
                      >
                        Selecionar todos
                      </button>
                      <span className="text-[10px] text-border">|</span>
                      <button
                        type="button"
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => {
                          setAvulsaSelectedItemIds(new Set())
                          recalcAvulsaValor(new Set(), avulsaExtraItems, avulsaItemEdits)
                        }}
                      >
                        Desmarcar todos
                      </button>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 bg-card space-y-3">

                  {/* ── Formulário para adicionar item avulso ── */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Descrição do serviço avulso"
                      value={avulsaExtraNome}
                      onChange={(e) => setAvulsaExtraNome(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAvulsaExtra())}
                      className="h-8 text-sm flex-1"
                    />
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={avulsaExtraValor}
                      onChange={(e) => setAvulsaExtraValor(inputToBRL(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAvulsaExtra())}
                      className="h-8 text-sm w-28 text-right tabular-nums"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 shrink-0"
                      onClick={addAvulsaExtra}
                      disabled={!avulsaExtraNome.trim() || parseBRL(avulsaExtraValor) <= 0}
                    >
                      <Plus size={14} className="mr-1" /> Adicionar
                    </Button>
                  </div>

                  {/* ── Itens avulsos adicionados ── */}
                  {avulsaExtraItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avulsos</p>
                      {avulsaExtraItems.map(e => (
                        <div key={e.id} className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-1.5">
                          <span className="flex-1 text-sm font-medium text-foreground">{e.nome}</span>
                          <span className="text-sm font-semibold tabular-nums text-foreground w-28 text-right">{money(e.valor)}</span>
                          <button
                            type="button"
                            onClick={() => removeAvulsaExtra(e.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                            aria-label="Remover item"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Serviços do contrato ── */}
                  {(avulsaContract || avulsaItemsLoading || (avulsaItems && avulsaItems.length > 0)) && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Do contrato</p>
                      {avulsaItemsLoading ? (
                        <p className="text-xs text-muted-foreground">Carregando serviços...</p>
                      ) : !avulsaItems || avulsaItems.length === 0 ? (
                        <p className="text-xs italic text-muted-foreground">Nenhum serviço cadastrado neste contrato.</p>
                      ) : (
                        <div className="space-y-1">
                          {avulsaItems.map(ci => {
                            const checked = avulsaSelectedItemIds.has(ci.id)
                            const edit = avulsaItemEdits[ci.id]
                            return (
                              <div
                                key={ci.id}
                                className={`flex items-center gap-2 rounded-lg px-2 py-1 transition-colors ${checked ? 'bg-muted/60' : 'opacity-50'}`}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => toggleAvulsaItem(ci.id, !!v)}
                                  className="shrink-0"
                                />
                                <input
                                  type="text"
                                  value={edit?.nome ?? ci.nome}
                                  onChange={(e) => handleAvulsaItemEdit(ci.id, 'nome', e.target.value)}
                                  className="flex-1 min-w-0 text-sm font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-foreground py-0.5"
                                />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={edit?.valorDisplay ?? numToBRL(ci.valor_unitario * ci.quantidade)}
                                  onChange={(e) => handleAvulsaItemEdit(ci.id, 'valorDisplay', e.target.value)}
                                  className={`w-28 text-sm font-semibold tabular-nums text-right bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none py-0.5 ${checked ? 'text-foreground' : 'text-muted-foreground'}`}
                                />
                              </div>
                            )
                          })}
                          <div className="pt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>{avulsaSelectedItemIds.size} de {avulsaItems.length} selecionado{avulsaSelectedItemIds.size !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!avulsaContract && avulsaExtraItems.length === 0 && (
                    <p className="text-xs italic text-muted-foreground">Sem contrato ativo — adicione itens avulsos acima.</p>
                  )}

                </div>
              </div>
            )}

            {/* Descrição para cobrança bancária */}
            {avulsaForm.client_id && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">
                    Descrição para cobrança bancária / boleto
                  </p>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] tabular-nums font-semibold ${
                      avulsaForm.descricao_cobranca.length > 240 ? 'text-red-500' :
                      avulsaForm.descricao_cobranca.length > 200 ? 'text-amber-500' :
                      'text-muted-foreground'
                    }`}>
                      {avulsaForm.descricao_cobranca.length}/250
                    </span>
                    <button
                      type="button"
                      onClick={handleAvulsaDescrRestore}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCcw size={11} /> restaurar
                    </button>
                  </div>
                </div>
                <textarea
                  maxLength={250}
                  rows={2}
                  value={avulsaForm.descricao_cobranca}
                  placeholder="Descrição para o banco/boleto"
                  className="w-full resize-none text-sm rounded-lg border border-border bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                  onChange={(e) => setAvulsaForm(f => ({ ...f, descricao_cobranca: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Gerado do template do cliente (ou padrão do escritório) · editável
                </p>
              </div>
            )}

          </div>{/* end scrollable body */}

          <DialogFooter className="shrink-0 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setAvulsaDialog(false)}>Cancelar</Button>
            <Button
              onClick={createAvulsa}
              disabled={!avulsaForm.client_id || !avulsaForm.competencia || !avulsaForm.vencimento || parseBRL(avulsaForm.valor_original) <= 0 || createInvoice.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pay Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Baixa Manual</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {payTarget && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Cliente:</span> {clientName(payTarget.client_id)}</p>
                <p><span className="text-muted-foreground">Competência:</span> {payTarget.competencia}</p>
                <p><span className="text-muted-foreground">Valor:</span> {money(payTarget.valor_original)}</p>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="pay-date">Data do Pagamento</Label>
              <Input id="pay-date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancelar</Button>
            <Button onClick={confirmPay}>Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
