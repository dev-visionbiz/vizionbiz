import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInDays, format, formatDistanceToNow, parseISO, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/auth/AuthProvider'
import { useInvoices, useOverdueInvoices, useUpdateInvoice } from '@/data/hooks/useInvoices'
import { useDocuments } from '@/data/hooks/useDocuments'
import { useClients } from '@/data/hooks/useClients'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { useClientDocumentEvents } from '@/data/hooks/useDocumentEvents'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import { useToast } from '@/components/ui/use-toast'
import { TrendingUp, AlertCircle, Users, FileText, Upload, Download, Eye, Share2 } from 'lucide-react'
import type { Invoice } from '@/domain/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'

const eventIcons: Record<string, React.ElementType> = {
  upload: Upload,
  download: Download,
  view: Eye,
  share: Share2,
}

const eventLabels: Record<string, string> = {
  upload: 'Upload',
  download: 'Download',
  view: 'Visualização',
  share: 'Compartilhamento',
}

function DaysAtraso({ days }: { days: number }) {
  const cls =
    days < 7
      ? 'bg-green-100 text-green-800 border-transparent'
      : days <= 30
      ? 'bg-yellow-100 text-yellow-800 border-transparent'
      : 'bg-red-100 text-red-800 border-transparent'
  return <Badge className={cls}>{days}d</Badge>
}

// Quick manual pay dialog
function BaixaManualDialog({
  invoice,
  open,
  onClose,
}: {
  invoice: Invoice | null
  open: boolean
  onClose: () => void
}) {
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0])
  const updateInvoice = useUpdateInvoice()
  const { toast } = useToast()

  async function confirm() {
    if (!invoice) return
    await updateInvoice.mutateAsync({ id: invoice.id, data: { status: 'paga' } })
    toast({ title: 'Fatura baixada como paga' })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Baixa Manual</DialogTitle>
        </DialogHeader>
        {invoice && (
          <div className="space-y-3 py-2">
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p>Competência: {invoice.competencia}</p>
              <p>Valor: {formatCurrency(invoice.valor_original)}</p>
            </div>
            <div className="space-y-1">
              <Label>Data do pagamento</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Dashboard() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: invoices, isLoading: loadingInv } = useInvoices(tenantId)
  const { data: documents, isLoading: loadingDocs } = useDocuments(tenantId)
  const { data: clients } = useClients(tenantId)
  const { data: policy } = useBillingPolicy(tenantId)

  // We need document events - fetch all for the tenant using a broad query
  // Since we don't have a useTenantDocumentEvents, use useClientDocumentEvents per client -
  // but for dashboard, we'll aggregate from documents
  // Use a simple in-memory approach via localStorage directly
  const allEvents = (() => {
    try {
      const raw = localStorage.getItem('vb_document_events')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })()

  const [baixaTarget, setBaixaTarget] = useState<Invoice | null>(null)
  const [baixaOpen, setBaixaOpen] = useState(false)

  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  if (loadingInv || loadingDocs) return <PageLoader />

  const allInvoices = invoices ?? []
  const allDocs = documents ?? []
  const allClients = clients ?? []

  // A Receber: faturas abertas com vencimento no mês atual
  const aReceber = allInvoices
    .filter((i) => i.status === 'aberta' && i.vencimento.startsWith(currentMonth))
    .reduce((s, i) => s + i.valor_original, 0)

  // Em Atraso: valor atualizado das vencidas
  const vencidas = allInvoices.filter((i) => i.status === 'vencida')
  const emAtraso = vencidas.reduce((s, inv) => {
    if (!policy) return s + inv.valor_original
    return s + calcularEncargos(inv, policy, today).total
  }, 0)

  // Clientes inadimplentes (fora da carência)
  const clientesInadimplentes = new Set(
    vencidas
      .filter(
        (inv) =>
          policy &&
          differenceInDays(today, parseISO(inv.vencimento)) > policy.carencia_dias
      )
      .map((inv) => inv.client_id)
  ).size

  // Docs enviados mês atual
  const docsEnviadosMes = allDocs.filter(
    (d) => d.criado_em.startsWith(currentMonth)
  ).length

  // Last 6 months chart data
  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(today, 5 - i)
    const monthKey = format(date, 'yyyy-MM')
    const label = format(date, 'MMM/yy', { locale: ptBR })
    const value = allInvoices
      .filter((inv) => inv.status === 'vencida' && inv.competencia === monthKey)
      .reduce((s, inv) => {
        if (!policy) return s + inv.valor_original
        return s + calcularEncargos(inv, policy, today).total
      }, 0)
    return { monthKey, label, value }
  })
  const maxChartValue = Math.max(...chartMonths.map((m) => m.value), 1)

  // Vencidos ação rápida (max 10, sorted oldest first)
  const vencidasSorted = [...vencidas]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 10)

  const clientName = (id: string) =>
    allClients.find((c) => c.id === id)?.razao_social ?? id

  // Last 5 events
  const sortedEvents = [...allEvents]
    .sort((a: any, b: any) => b.em.localeCompare(a.em))
    .slice(0, 5)

  const docName = (docId: string) =>
    allDocs.find((d) => d.id === docId)?.nome ?? docId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do escritório</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              A Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(aReceber)}</p>
            <p className="text-xs text-muted-foreground">faturas abertas — {currentMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Em Atraso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(emAtraso)}</p>
            <p className="text-xs text-muted-foreground">com encargos atualizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-orange-500" />
              Inadimplentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500">{clientesInadimplentes}</p>
            <p className="text-xs text-muted-foreground">clientes fora da carência</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4 text-green-600" />
              Docs Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{docsEnviadosMes}</p>
            <p className="text-xs text-muted-foreground">documentos — {currentMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Overdue list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inadimplência chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Inadimplência — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {chartMonths.map((m) => (
                <div key={m.monthKey} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{m.label}</span>
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-destructive/70 rounded-full transition-all"
                      style={{ width: `${(m.value / maxChartValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-20 text-right shrink-0">
                    {m.value > 0 ? formatCurrency(m.value) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Latest activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Últimas Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            {!sortedEvents.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((ev: any) => {
                  const Icon = eventIcons[ev.evento] ?? FileText
                  return (
                    <div key={ev.id} className="flex items-start gap-2 text-sm">
                      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{docName(ev.document_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          {eventLabels[ev.evento]} por {ev.user_id}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(ev.em), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vencidos - Ação Rápida */}
      {vencidasSorted.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Vencidos — Ação Rápida</h2>
          <div className="flex flex-col gap-2">
            {vencidasSorted.map((inv) => {
              const dias = differenceInDays(today, parseISO(inv.vencimento))
              const updated = policy ? calcularEncargos(inv, policy, today).total : inv.valor_original
              return (
                <div key={inv.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{clientName(inv.client_id)}</p>
                    <DaysAtraso days={dias} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Competência</span>
                    <span className="text-right">{inv.competencia}</span>
                    <span className="text-muted-foreground">Vencimento</span>
                    <span className="text-right font-medium">{formatDate(inv.vencimento)}</span>
                    <span className="text-muted-foreground">Valor atualizado</span>
                    <span className="text-right font-semibold text-destructive">{formatCurrency(updated)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setBaixaTarget(inv); setBaixaOpen(true) }}>
                      Baixa Manual
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground shrink-0" onClick={() => navigate(`/escritorio/clientes/${inv.client_id}`)}>
                      Ver Cliente
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <BaixaManualDialog
        invoice={baixaTarget}
        open={baixaOpen}
        onClose={() => {
          setBaixaOpen(false)
          setBaixaTarget(null)
        }}
      />
    </div>
  )
}
