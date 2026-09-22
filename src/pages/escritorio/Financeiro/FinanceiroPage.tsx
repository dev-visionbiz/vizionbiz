import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { useInvoices, useCreateInvoice, useUpdateInvoice } from '@/data/hooks/useInvoices'
import { useContracts } from '@/data/hooks/useContracts'
import { useClients } from '@/data/hooks/useClients'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Receipt, X } from 'lucide-react'
import type { Invoice, InvoiceStatus } from '@/domain/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'
import { v4 as uuidv4 } from 'uuid'

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

export default function FinanceiroPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: invoices, isLoading } = useInvoices(tenantId)
  const { data: contracts } = useContracts(tenantId)
  const { data: clients } = useClients(tenantId)
  const { data: policy } = useBillingPolicy(tenantId)
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const { toast } = useToast()

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterClient, setFilterClient] = useState<string>('todos')
  const [filterComp, setFilterComp] = useState('')

  // Lote dialog
  const [loteDialog, setLoteDialog] = useState(false)
  const [loteComp, setLoteComp] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Avulsa dialog
  const [avulsaDialog, setAvulsaDialog] = useState(false)
  const [avulsaForm, setAvulsaForm] = useState({
    client_id: '',
    competencia: '',
    vencimento: '',
    valor_original: '',
  })

  // Pay dialog
  const [payDialog, setPayDialog] = useState(false)
  const [payTarget, setPayTarget] = useState<Invoice | null>(null)
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0])

  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const clientName = (id: string) => clients?.find((c) => c.id === id)?.razao_social ?? id

  const getUpdatedValue = (inv: Invoice) => {
    if (inv.status !== 'vencida' || !policy) return inv.valor_original
    return calcularEncargos(inv, policy, today).total
  }

  const filtered = invoices?.filter((inv) => {
    if (filterStatus !== 'todos' && inv.status !== filterStatus) return false
    if (filterClient !== 'todos' && inv.client_id !== filterClient) return false
    if (filterComp && !inv.competencia.includes(filterComp)) return false
    return true
  })

  // Summary cards
  const aReceber = invoices?.filter((i) => i.status === 'aberta').reduce((s, i) => s + i.valor_original, 0) ?? 0
  const vencido = invoices?.filter((i) => i.status === 'vencida').reduce((s, i) => s + getUpdatedValue(i), 0) ?? 0
  const pagoMes = invoices?.filter((i) => i.status === 'paga' && i.competencia === currentMonth).reduce((s, i) => s + i.valor_original, 0) ?? 0

  const clearFilters = () => {
    setFilterStatus('todos')
    setFilterClient('todos')
    setFilterComp('')
  }

  const gerarLote = async () => {
    const activeContracts = contracts?.filter((c) => c.status === 'ativo') ?? []
    const existingComp = invoices?.filter((i) => i.competencia === loteComp).map((i) => i.client_id) ?? []

    let count = 0
    for (const contract of activeContracts) {
      if (existingComp.includes(contract.client_id)) continue

      const vencStr = `${loteComp}-${String(contract.dia_vencimento).padStart(2, '0')}`
      const nova: Invoice = {
        id: uuidv4(),
        tenant_id: tenantId,
        client_id: contract.client_id,
        contract_id: contract.id,
        competencia: loteComp,
        vencimento: vencStr,
        valor_original: contract.valor_mensal,
        status: 'aberta',
        origem: 'contrato',
      }
      await createInvoice.mutateAsync(nova)
      count++
    }

    toast({ title: `Lote gerado: ${count} fatura(s) criada(s) para ${loteComp}` })
    setLoteDialog(false)
  }

  const createAvulsa = async () => {
    const { client_id, competencia, vencimento, valor_original } = avulsaForm
    if (!client_id || !competencia || !vencimento || !valor_original) return
    const nova: Invoice = {
      id: uuidv4(),
      tenant_id: tenantId,
      client_id,
      competencia,
      vencimento,
      valor_original: parseFloat(valor_original),
      status: 'aberta',
      origem: 'avulsa',
    }
    try {
      await createInvoice.mutateAsync(nova)
      toast({ title: 'Fatura avulsa criada' })
      setAvulsaDialog(false)
      setAvulsaForm({ client_id: '', competencia: '', vencimento: '', valor_original: '' })
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const confirmPay = async () => {
    if (!payTarget) return
    try {
      await updateInvoice.mutateAsync({ id: payTarget.id, data: { status: 'paga' } })
      toast({ title: 'Fatura baixada como paga' })
      setPayDialog(false)
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const cancelInvoice = async (inv: Invoice) => {
    if (!confirm('Cancelar esta fatura?')) return
    try {
      await updateInvoice.mutateAsync({ id: inv.id, data: { status: 'cancelada' } })
      toast({ title: 'Fatura cancelada' })
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Gestão de faturas e cobranças</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setLoteDialog(true)}>
            <Receipt className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Gerar Lote Mensal</span>
            <span className="sm:hidden">Lote Mensal</span>
          </Button>
          <Button onClick={() => setAvulsaDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Fatura Avulsa
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(aReceber)}</p>
            <p className="text-xs text-muted-foreground">faturas abertas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencido (c/ encargos)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(vencido)}</p>
            <p className="text-xs text-muted-foreground">faturas vencidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago no Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(pagoMes)}</p>
            <p className="text-xs text-muted-foreground">competência {currentMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="paga">Paga</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="renegociada">Renegociada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos clientes</SelectItem>
            {clients?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Competência (ex: 2025-07)"
          value={filterComp}
          onChange={(e) => setFilterComp(e.target.value)}
          className="w-full sm:w-48"
        />
        {(filterStatus !== 'todos' || filterClient !== 'todos' || filterComp) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" /> Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      {!filtered?.length ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma fatura"
          description="Nenhuma fatura encontrada com os filtros selecionados."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((inv) => {
            const updated = getUpdatedValue(inv)
            const hasCharges = updated > inv.valor_original
            return (
              <div key={inv.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm leading-tight">{clientName(inv.client_id)}</p>
                  <InvBadge status={inv.status} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Vencimento</span>
                  <span className="text-right font-medium">{formatDate(inv.vencimento)}</span>
                  <span className="text-muted-foreground">Competência</span>
                  <span className="text-right">{inv.competencia}</span>
                  <span className="text-muted-foreground">Valor original</span>
                  <span className="text-right">{formatCurrency(inv.valor_original)}</span>
                  {hasCharges && (
                    <>
                      <span className="text-muted-foreground">Com encargos</span>
                      <span className="text-right font-semibold text-destructive">{formatCurrency(updated)}</span>
                    </>
                  )}
                </div>
                {(inv.status === 'aberta' || inv.status === 'vencida') && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setPayTarget(inv); setPayDate(new Date().toISOString().split('T')[0]); setPayDialog(true) }}>
                      Baixar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => cancelInvoice(inv)}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lote Dialog */}
      <Dialog open={loteDialog} onOpenChange={setLoteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerar Lote Mensal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Serão criadas faturas para todos os contratos ativos que ainda não têm fatura na competência selecionada.
            </p>
            <div className="space-y-1">
              <Label htmlFor="lote-comp">Competência</Label>
              <Input id="lote-comp" placeholder="2025-07" value={loteComp} onChange={(e) => setLoteComp(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoteDialog(false)}>Cancelar</Button>
            <Button onClick={gerarLote} disabled={!loteComp || createInvoice.isPending}>
              Gerar Faturas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avulsa Dialog */}
      <Dialog open={avulsaDialog} onOpenChange={setAvulsaDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fatura Avulsa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <Select value={avulsaForm.client_id} onValueChange={(v) => setAvulsaForm((f) => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="av-comp">Competência (AAAA-MM)</Label>
              <Input id="av-comp" placeholder="2025-07" value={avulsaForm.competencia} onChange={(e) => setAvulsaForm((f) => ({ ...f, competencia: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="av-venc">Vencimento</Label>
              <Input id="av-venc" type="date" value={avulsaForm.vencimento} onChange={(e) => setAvulsaForm((f) => ({ ...f, vencimento: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="av-valor">Valor (R$)</Label>
              <Input id="av-valor" type="number" step="0.01" value={avulsaForm.valor_original} onChange={(e) => setAvulsaForm((f) => ({ ...f, valor_original: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvulsaDialog(false)}>Cancelar</Button>
            <Button
              onClick={createAvulsa}
              disabled={!avulsaForm.client_id || !avulsaForm.competencia || !avulsaForm.vencimento || !avulsaForm.valor_original}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Baixa Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {payTarget && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Cliente:</span> {clientName(payTarget.client_id)}</p>
                <p><span className="text-muted-foreground">Competência:</span> {payTarget.competencia}</p>
                <p><span className="text-muted-foreground">Valor:</span> {formatCurrency(payTarget.valor_original)}</p>
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
