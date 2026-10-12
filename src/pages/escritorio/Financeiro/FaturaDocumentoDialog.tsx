import { useRef } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/auth/AuthProvider'
import { useClient } from '@/data/hooks/useClients'
import { useContratoItems } from '@/data/hooks/useContratoItems'
import { useServicosRealizados } from '@/data/hooks/useServicosRealizados'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X, Building2, User2, CalendarDays, Receipt, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import type { Invoice } from '@/domain/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function money(n: number) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function faturaNumero(inv: Invoice): string {
  const [y, m] = inv.competencia.split('-')
  return `FAT-${y}${m}-${inv.id.slice(0, 6).toUpperCase()}`
}

function compLabel(competencia: string): string {
  const [y, m] = competencia.split('-')
  return format(new Date(Number(y), Number(m) - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })
    .replace(/^\w/, c => c.toUpperCase())
}

function cnpjMask(v?: string) {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length !== 14) return v
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function cpfMask(v?: string) {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length !== 11) return v
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  aberta:      { label: 'Em aberto',  icon: <Clock size={14} />,         cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800' },
  vencida:     { label: 'Em atraso',  icon: <AlertCircle size={14} />,   cls: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-300 dark:border-red-800' },
  paga:        { label: 'Paga',       icon: <CheckCircle2 size={14} />,  cls: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-300 dark:border-green-800' },
  renegociada: { label: 'Negociada',  icon: <Receipt size={14} />,       cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-800' },
  cancelada:   { label: 'Cancelada',  icon: <X size={14} />,             cls: 'bg-muted text-muted-foreground border-border' },
}

// ─── component ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  invoice: Invoice
  tenantId: string
}

export function FaturaDocumentoDialog({ open, onClose, invoice, tenantId }: Props) {
  const { currentTenant } = useAuth()
  const { data: client } = useClient(invoice.client_id)
  const { data: contratoItems } = useContratoItems(tenantId, invoice.contract_id ?? '')
  const { data: todosServicos } = useServicosRealizados(tenantId)
  const { data: policy } = useBillingPolicy(tenantId)

  const printRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  const servicosNaFatura = (todosServicos ?? []).filter(s => s.invoice_id === invoice.id)

  const encargos = invoice.status === 'vencida' && policy
    ? calcularEncargos(invoice, policy, today)
    : null

  const daysLate = invoice.status === 'vencida'
    ? differenceInDays(today, parseISO(invoice.vencimento))
    : 0

  const totalServicosContrato = (contratoItems ?? []).reduce(
    (acc, ci) => acc + ci.valor_unitario * ci.quantidade, 0
  )
  const totalServicosAdicionais = servicosNaFatura.reduce((acc, s) => acc + s.valor, 0)
  const subtotal = invoice.valor_original
  const totalComEncargos = encargos && !encargos.dentro_carencia ? encargos.total : subtotal

  const statusMeta = STATUS_META[invoice.status] ?? STATUS_META.aberta
  const numero = faturaNumero(invoice)
  const emissaoLabel = format(parseISO(invoice.vencimento), 'dd/MM/yyyy')
  const vencLabel = format(parseISO(invoice.vencimento), 'dd/MM/yyyy')
  const competenciaLabel = compLabel(invoice.competencia)

  const handlePrint = () => {
    const area = document.getElementById('fatura-print-area')
    if (!area) return
    window.print()
  }

  const tenant = currentTenant
  const endereco = [
    tenant?.endereco_logradouro,
    tenant?.endereco_numero,
    tenant?.endereco_bairro,
    tenant?.endereco_cidade && tenant?.endereco_estado
      ? `${tenant.endereco_cidade} – ${tenant.endereco_estado}`
      : tenant?.endereco_cidade,
  ].filter(Boolean).join(', ')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl w-full p-0 overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* ── toolbar ── */}
        <div className="fatura-no-print flex items-center justify-between gap-3 px-5 py-3 border-b border-border shrink-0 bg-muted/40">
          <div className="flex items-center gap-2.5">
            <Receipt size={17} className="text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">{numero}</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.cls}`}>
              {statusMeta.icon}
              {statusMeta.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer size={14} className="mr-1.5" /> Imprimir / PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="px-2">
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* ── document (scrollable + print target) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div
            id="fatura-print-area"
            ref={printRef}
            className="bg-white dark:bg-card p-8 space-y-6 min-h-full"
          >

            {/* ── 1. Header: escritório ── */}
            <div className="fatura-header-border flex items-start justify-between gap-6 pb-5 border-b border-border">
              <div className="flex-1 min-w-0">
                {tenant?.logo_url ? (
                  <img src={tenant.logo_url} alt={tenant.nome} className="h-10 w-auto object-contain mb-2" />
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 size={20} className="text-primary shrink-0" />
                    <span className="text-[17px] font-extrabold text-foreground leading-tight">
                      {tenant?.nome ?? 'Escritório'}
                    </span>
                  </div>
                )}
                {tenant?.razao_social && tenant.razao_social !== tenant.nome && (
                  <p className="text-[13px] text-muted-foreground">{tenant.razao_social}</p>
                )}
                {tenant?.cnpj && (
                  <p className="text-[13px] text-muted-foreground">CNPJ: {cnpjMask(tenant.cnpj)}</p>
                )}
                {tenant?.crc && (
                  <p className="text-[13px] text-muted-foreground">CRC: {tenant.crc}</p>
                )}
                {endereco && (
                  <p className="text-[13px] text-muted-foreground mt-0.5">{endereco}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                  {tenant?.telefone && <p className="text-[13px] text-muted-foreground">{tenant.telefone}</p>}
                  {tenant?.email && <p className="text-[13px] text-muted-foreground">{tenant.email}</p>}
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[22px] font-extrabold text-foreground tracking-tight leading-none">FATURA</p>
                <p className="text-[13px] font-bold text-primary mt-1">{numero}</p>
                <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-bold border ${statusMeta.cls}`}>
                  {statusMeta.icon}
                  {statusMeta.label}
                </div>
              </div>
            </div>

            {/* ── 2. Metadados da fatura ── */}
            <div className="grid grid-cols-3 gap-4">
              <div className="fatura-section-border rounded-[12px] border border-border px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarDays size={13} className="text-muted-foreground" />
                  <span className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">Competência</span>
                </div>
                <p className="text-[14px] font-bold text-foreground">{competenciaLabel}</p>
              </div>
              <div className="fatura-section-border rounded-[12px] border border-border px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarDays size={13} className="text-muted-foreground" />
                  <span className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">Vencimento</span>
                </div>
                <p className="text-[14px] font-bold text-foreground">{vencLabel}</p>
                {invoice.status === 'vencida' && (
                  <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 mt-0.5">
                    {daysLate} dia{daysLate !== 1 ? 's' : ''} em atraso
                  </p>
                )}
              </div>
              <div className="fatura-section-border rounded-[12px] border border-border px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Receipt size={13} className="text-muted-foreground" />
                  <span className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">Emissão</span>
                </div>
                <p className="text-[14px] font-bold text-foreground">{emissaoLabel}</p>
              </div>
            </div>

            {/* ── 3. Prestador / Tomador ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="fatura-section-border rounded-[12px] border border-border px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Building2 size={13} className="text-primary" />
                  <span className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">Prestador</span>
                </div>
                <p className="text-[14px] font-bold text-foreground leading-tight">{tenant?.nome ?? '—'}</p>
                {tenant?.cnpj && <p className="text-[12px] text-muted-foreground mt-0.5">CNPJ: {cnpjMask(tenant.cnpj)}</p>}
                {endereco && <p className="text-[12px] text-muted-foreground mt-0.5">{endereco}</p>}
              </div>
              <div className="fatura-section-border rounded-[12px] border border-border px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <User2 size={13} className="text-primary" />
                  <span className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground">Tomador</span>
                </div>
                <p className="text-[14px] font-bold text-foreground leading-tight">
                  {client?.razao_social ?? '—'}
                </p>
                {client?.fantasia && (
                  <p className="text-[12px] text-muted-foreground">{client.fantasia}</p>
                )}
                {client?.cnpj && <p className="text-[12px] text-muted-foreground mt-0.5">CNPJ: {cnpjMask(client.cnpj)}</p>}
                {client?.cpf && !client?.cnpj && <p className="text-[12px] text-muted-foreground mt-0.5">CPF: {cpfMask(client.cpf)}</p>}
                {client?.email && <p className="text-[12px] text-muted-foreground mt-0.5">{client.email}</p>}
              </div>
            </div>

            {/* ── 4. Tabela de serviços ── */}
            <div className="fatura-section-border rounded-[12px] border border-border overflow-hidden">
              {/* header */}
              <div className="grid gap-3 px-4 py-2.5 bg-muted/60 border-b border-border text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground"
                style={{ gridTemplateColumns: 'minmax(0,1fr) 60px 100px 100px' }}>
                <div>Descrição</div>
                <div className="text-center">Qtd</div>
                <div className="text-right">Valor unit.</div>
                <div className="text-right">Total</div>
              </div>

              {/* itens do contrato */}
              {contratoItems && contratoItems.length > 0 && contratoItems.map(ci => (
                <div
                  key={ci.id}
                  className="grid gap-3 px-4 py-2.5 border-b border-border/60 last:border-0 items-center"
                  style={{ gridTemplateColumns: 'minmax(0,1fr) 60px 100px 100px' }}
                >
                  <span className="text-[13px] font-medium text-foreground">{ci.nome}</span>
                  <span className="text-[13px] tabular-nums text-center text-muted-foreground">{ci.quantidade}</span>
                  <span className="text-[13px] tabular-nums text-right text-foreground">{money(ci.valor_unitario)}</span>
                  <span className="text-[13px] tabular-nums text-right font-semibold text-foreground">{money(ci.valor_unitario * ci.quantidade)}</span>
                </div>
              ))}

              {/* sem itens do contrato → linha única com valor total do contrato */}
              {(!contratoItems || contratoItems.length === 0) && invoice.contract_id && (
                <div
                  className="grid gap-3 px-4 py-2.5 border-b border-border/60 items-center"
                  style={{ gridTemplateColumns: 'minmax(0,1fr) 60px 100px 100px' }}
                >
                  <span className="text-[13px] font-medium text-foreground">
                    {invoice.descricao_cobranca || `Honorários — ${competenciaLabel}`}
                  </span>
                  <span className="text-[13px] tabular-nums text-center text-muted-foreground">1</span>
                  <span className="text-[13px] tabular-nums text-right text-foreground">{money(invoice.valor_original - totalServicosAdicionais)}</span>
                  <span className="text-[13px] tabular-nums text-right font-semibold text-foreground">{money(invoice.valor_original - totalServicosAdicionais)}</span>
                </div>
              )}

              {/* serviços adicionais */}
              {servicosNaFatura.length > 0 && (
                <>
                  <div className="px-4 py-1.5 bg-amber-50/60 dark:bg-amber-950/10 border-b border-border/60">
                    <span className="text-[10px] font-extrabold tracking-widest uppercase text-amber-700 dark:text-amber-400">
                      Serviços assessórios
                    </span>
                  </div>
                  {servicosNaFatura.map(s => (
                    <div
                      key={s.id}
                      className="grid gap-3 px-4 py-2.5 border-b border-border/60 last:border-0 items-center"
                      style={{ gridTemplateColumns: 'minmax(0,1fr) 60px 100px 100px' }}
                    >
                      <div>
                        <span className="text-[13px] font-medium text-foreground">{s.nome}</span>
                        {s.descricao && <p className="text-[11px] text-muted-foreground">{s.descricao}</p>}
                      </div>
                      <span className="text-[13px] tabular-nums text-center text-muted-foreground">1</span>
                      <span className="text-[13px] tabular-nums text-right text-foreground">{money(s.valor)}</span>
                      <span className="text-[13px] tabular-nums text-right font-semibold text-foreground">{money(s.valor)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* ── 5. Totais ── */}
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-1">
                {/* subtotal */}
                {(totalServicosAdicionais > 0 || (contratoItems && contratoItems.length > 0)) && (
                  <>
                    {contratoItems && contratoItems.length > 0 && (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-muted-foreground">Honorários</span>
                        <span className="tabular-nums font-semibold text-foreground">{money(totalServicosContrato)}</span>
                      </div>
                    )}
                    {totalServicosAdicionais > 0 && (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-muted-foreground">Serviços assessórios</span>
                        <span className="tabular-nums font-semibold text-foreground">{money(totalServicosAdicionais)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[13px] border-t border-border pt-1">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums font-semibold text-foreground">{money(subtotal)}</span>
                    </div>
                  </>
                )}

                {/* encargos */}
                {encargos && !encargos.dentro_carencia && (
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2 space-y-1 border border-red-200 dark:border-red-900 mt-2">
                    <p className="text-[10px] font-extrabold tracking-widest uppercase text-red-600 dark:text-red-400">
                      Encargos por atraso
                    </p>
                    {encargos.memoria.filter(m => m.valor > 0).map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-[12px]">
                        <span className="text-red-700 dark:text-red-300">{m.descricao}</span>
                        <span className="tabular-nums font-semibold text-red-600 dark:text-red-400">+ {money(m.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* total final */}
                <div className="fatura-total-row flex items-center justify-between pt-2 mt-1 border-t-2 border-foreground/20">
                  <span className="text-[15px] font-extrabold text-foreground">TOTAL</span>
                  <span className={`text-[18px] font-extrabold tabular-nums ${
                    invoice.status === 'vencida' && encargos && !encargos.dentro_carencia
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-foreground'
                  }`}>
                    {money(totalComEncargos)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 6. Pagamento ── */}
            {(tenant?.chave_pix || tenant?.instrucoes_pagamento || tenant?.email || tenant?.telefone) && (
              <div className="fatura-section-border rounded-[12px] border border-border px-4 py-3">
                <p className="text-[10px] font-extrabold tracking-widest uppercase text-muted-foreground mb-2">
                  Informações de pagamento
                </p>
                <div className="space-y-1">
                  {tenant.chave_pix && (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-foreground">PIX:</span>
                      <span className="text-[13px] tabular-nums text-foreground font-mono">{tenant.chave_pix}</span>
                    </div>
                  )}
                  {tenant.instrucoes_pagamento && (
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{tenant.instrucoes_pagamento}</p>
                  )}
                  {!tenant.chave_pix && !tenant.instrucoes_pagamento && (
                    <div className="flex flex-wrap gap-x-6 gap-y-0.5">
                      {tenant.telefone && (
                        <span className="text-[13px] text-foreground">Tel: {tenant.telefone}</span>
                      )}
                      {tenant.email && (
                        <span className="text-[13px] text-foreground">{tenant.email}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── 7. Nota de rodapé ── */}
            <div className="pt-2 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed text-center">
                Documento de cobrança emitido por {tenant?.nome ?? 'Escritório'}.
                Em caso de dúvidas, entre em contato com o escritório.
                {invoice.permite_renegociacao !== false && invoice.status !== 'paga' && ' · Este documento aceita renegociação de débitos.'}
              </p>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
