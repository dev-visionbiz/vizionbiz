import { useState } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { usePortalAcesso } from '@/data/hooks/usePortalAcesso'
import { differenceInDays, parseISO } from 'date-fns'
import { useAuth } from '@/auth/AuthProvider'
import { useClientInvoices } from '@/data/hooks/useInvoices'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { Receipt, ChevronDown, ChevronUp } from 'lucide-react'
import type { Invoice, InvoiceStatus } from '@/domain/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'
import { CheckoutModal } from './CheckoutModal'
import { RenegociacaoWizard } from './RenegociacaoWizard'

const invoiceStatusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  aberta: { label: 'Aberta', className: 'bg-blue-100 text-blue-800 border-transparent' },
  vencida: { label: 'Vencida', className: 'bg-red-100 text-red-800 border-transparent' },
  paga: { label: 'Paga', className: 'bg-green-100 text-green-800 border-transparent' },
  cancelada: { label: 'Cancelada', className: 'bg-gray-100 text-gray-600 border-transparent' },
  renegociada: { label: 'Renegociada', className: 'bg-purple-100 text-purple-800 border-transparent' },
}

function InvBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = invoiceStatusConfig[status]
  return <Badge className={className}>{label}</Badge>
}

function EncargosAccordion({ invoice, policy }: { invoice: Invoice; policy: any }) {
  const [open, setOpen] = useState(false)
  const calc = calcularEncargos(invoice, policy, new Date())

  return (
    <div className="text-xs">
      <button
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Memória de cálculo
      </button>
      {open && (
        <div className="mt-1 pl-3 space-y-0.5 border-l">
          {calc.memoria.map((m, i) => (
            <div key={i} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{m.descricao}</span>
              <span>{formatCurrency(m.valor)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-4 font-medium border-t pt-0.5">
            <span>Total atualizado</span>
            <span>{formatCurrency(calc.total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PortalFinanceiro() {
  const { secoesPermitidas, isLoading: loadingAcesso } = usePortalAcesso()
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const clientId = currentUser?.client_id ?? ''
  const [searchParams] = useSearchParams()
  const acaoParam = searchParams.get('acao')

  const { data: invoices, isLoading } = useClientInvoices(tenantId, clientId)
  const { data: policy } = useBillingPolicy(tenantId)

  const [checkoutInv, setCheckoutInv] = useState<Invoice | null>(null)
  const [showRenegociacao, setShowRenegociacao] = useState(acaoParam === 'renegociar')

  if (loadingAcesso) return <PageLoader />
  if (!secoesPermitidas.includes('financeiro')) return <Navigate to="/portal/inicio" replace />

  const today = new Date()

  const sorted = [...(invoices ?? [])].sort((a, b) => b.competencia.localeCompare(a.competencia))

  function getUpdatedValue(inv: Invoice): number {
    if (inv.status !== 'vencida' || !policy) return inv.valor_original
    return calcularEncargos(inv, policy, today).total
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Suas faturas</p>
        </div>
        <Button variant="outline" className="sm:shrink-0" onClick={() => setShowRenegociacao(true)}>
          Renegociar dívidas
        </Button>
      </div>

      {!sorted.length ? (
        <EmptyState icon={Receipt} title="Nenhuma fatura" description="Você não possui faturas." />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((inv) => {
            const updated = getUpdatedValue(inv)
            const isVencida = inv.status === 'vencida'
            return (
              <div key={inv.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm">Competência {inv.competencia}</p>
                  <InvBadge status={inv.status} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Vencimento</span>
                  <span className="text-right font-medium">{formatDate(inv.vencimento)}</span>
                  <span className="text-muted-foreground">Valor original</span>
                  <span className="text-right">{formatCurrency(inv.valor_original)}</span>
                  {isVencida && updated > inv.valor_original && (
                    <>
                      <span className="text-muted-foreground">Com encargos</span>
                      <span className="text-right font-semibold text-destructive">{formatCurrency(updated)}</span>
                    </>
                  )}
                </div>
                {isVencida && policy && (
                  <EncargosAccordion invoice={inv} policy={policy} />
                )}
                {(inv.status === 'aberta' || inv.status === 'vencida') && (
                  <Button size="sm" className="w-full" onClick={() => setCheckoutInv(inv)}>
                    Pagar
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {checkoutInv && (
        <CheckoutModal
          open={!!checkoutInv}
          onClose={() => setCheckoutInv(null)}
          invoice={checkoutInv}
          valorAtualizado={getUpdatedValue(checkoutInv)}
          tenantId={tenantId}
          clientId={clientId}
        />
      )}

      {showRenegociacao && (
        <RenegociacaoWizard
          open={showRenegociacao}
          onClose={() => setShowRenegociacao(false)}
          tenantId={tenantId}
          clientId={clientId}
        />
      )}
    </div>
  )
}
