import { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { addMonths, format } from 'date-fns'
import { useAuth } from '@/auth/AuthProvider'
import { useClientInvoices, useUpdateInvoice, useCreateInvoice } from '@/data/hooks/useInvoices'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { useCreateRenegotiation } from '@/data/hooks/useRenegotiations'
import { useClient } from '@/data/hooks/useClients'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type { Invoice } from '@/domain/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { simularRenegociacao } from '@/domain/financeiro/simularRenegociacao'
import { gerarTermoHTML } from '@/domain/financeiro/gerarTermo'

interface RenegociacaoWizardProps {
  open: boolean
  onClose: () => void
  tenantId: string
  clientId: string
  preSelectedInvoiceId?: string
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function RenegociacaoWizard({ open, onClose, tenantId, clientId, preSelectedInvoiceId }: RenegociacaoWizardProps) {
  const { currentUser, currentTenant } = useAuth()
  const { data: invoices } = useClientInvoices(tenantId, clientId)
  const { data: policy } = useBillingPolicy(tenantId)
  const { data: client } = useClient(clientId)
  const createRenegotiation = useCreateRenegotiation()
  const updateInvoice = useUpdateInvoice()
  const createInvoice = useCreateInvoice()
  const { toast } = useToast()

  const [step, setStep] = useState(1)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [termoAccepted, setTermoAccepted] = useState(false)
  const [parcelas, setParcelas] = useState(1)
  const [novasParcelas, setNovasParcelas] = useState<Invoice[]>([])

  // Step 1: select invoices
  const vencidas = useMemo(
    () => (invoices ?? []).filter((inv) => inv.status === 'vencida' || inv.status === 'aberta'),
    [invoices]
  )

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (preSelectedInvoiceId) return [preSelectedInvoiceId]
    return vencidas.filter((inv) => inv.status === 'vencida').map((i) => i.id)
  })

  const selectedInvoices = vencidas.filter((inv) => selectedIds.includes(inv.id))

  function toggleInvoice(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // Simulation
  const simulation = useMemo(() => {
    if (!policy || selectedInvoices.length === 0) return null
    return simularRenegociacao(selectedInvoices, policy, parcelas === 1 ? 0 : parcelas)
  }, [selectedInvoices, policy, parcelas])

  // Termo HTML
  const termoHTML = useMemo(() => {
    if (!simulation || !client || !currentTenant || !policy) return ''
    const tempReneg = {
      id: 'preview',
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
      aceite: { ip: '127.0.0.1', em: new Date().toISOString(), user_id: currentUser?.id ?? '' },
      status: 'pendente' as const,
    }
    return gerarTermoHTML(tempReneg, simulation, client, currentTenant)
  }, [simulation, client, currentTenant, tenantId, clientId, currentUser])

  async function handleAccept() {
    if (!simulation || !client || !currentTenant || !policy) return
    setAccepting(true)
    try {
      const hash = await sha256(termoHTML)
      const now = new Date()

      const renegId = uuidv4()
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
        termo_hash: hash,
        aceite: {
          ip: '127.0.0.1',
          em: now.toISOString(),
          user_id: currentUser?.id ?? '',
        },
        status: 'aceita',
      })

      // Mark original invoices as renegociada
      for (const id of simulation.invoice_ids) {
        await updateInvoice.mutateAsync({ id, data: { status: 'renegociada', renegotiation_id: renegId } })
      }

      // Create new installment invoices
      const novas: Invoice[] = []
      for (let p = 1; p <= simulation.parcelas; p++) {
        const vencimento = format(addMonths(now, p), 'yyyy-MM-dd')
        const competencia = format(addMonths(now, p), 'yyyy-MM')
        const nova: Invoice = {
          id: uuidv4(),
          tenant_id: tenantId,
          client_id: clientId,
          competencia,
          vencimento,
          valor_original: simulation.valor_parcela,
          status: 'aberta',
          origem: 'renegociacao',
          renegotiation_id: renegId,
        }
        await createInvoice.mutateAsync(nova)
        novas.push(nova)
      }

      setNovasParcelas(novas)
      setAccepted(true)
      setStep(4)
      toast({ title: `Renegociação aceita! ${simulation.parcelas} parcela(s) gerada(s).` })
    } catch (e) {
      toast({ title: 'Erro ao finalizar renegociação', variant: 'destructive' })
    } finally {
      setAccepting(false)
    }
  }

  function resetAndClose() {
    setStep(1)
    setAccepted(false)
    setTermoAccepted(false)
    setParcelas(1)
    setNovasParcelas([])
    onClose()
  }

  const maxParcelas = policy?.parcelas_max ?? 12

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Renegociação — Passo {step} de {accepted ? 4 : 3}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select invoices */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione as faturas que deseja incluir na renegociação.
            </p>
            {!vencidas.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma fatura disponível para renegociação.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {vencidas.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between border rounded p-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`inv-${inv.id}`}
                        checked={selectedIds.includes(inv.id)}
                        onCheckedChange={() => toggleInvoice(inv.id)}
                      />
                      <label htmlFor={`inv-${inv.id}`} className="text-sm cursor-pointer">
                        <span className="font-medium">{inv.competencia}</span>
                        <span className="text-muted-foreground ml-2">Venc: {formatDate(inv.vencimento)}</span>
                      </label>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(inv.valor_original)}</span>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
              <Button onClick={() => setStep(2)} disabled={selectedIds.length === 0}>
                Próximo
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Simulate */}
        {step === 2 && simulation && policy && (
          <div className="space-y-4">
            <Tabs defaultValue="avista">
              <TabsList>
                <TabsTrigger value="avista" onClick={() => setParcelas(1)}>À vista</TabsTrigger>
                <TabsTrigger value="parcelado" onClick={() => setParcelas(Math.min(2, maxParcelas))}>Parcelado</TabsTrigger>
              </TabsList>

              <TabsContent value="avista" className="space-y-4 mt-4">
                <div className="rounded-md border p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Principal</span>
                    <span>{formatCurrency(simulation.saldo_principal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Multa</span>
                    <span>{formatCurrency(simulation.multa)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Juros</span>
                    <span>{formatCurrency(simulation.juros)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Correção</span>
                    <span>{formatCurrency(simulation.correcao)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Encargo renegociação</span>
                    <span>{formatCurrency(simulation.encargo)}</span>
                  </div>
                  {simulation.desconto_aplicado > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto à vista ({policy.desconto_avista_encargos_pct}%)</span>
                      <span>-{formatCurrency(simulation.desconto_aplicado)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>TOTAL</span>
                    <span className="text-primary">{formatCurrency(simulation.total)}</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="parcelado" className="space-y-4 mt-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm">Parcelas:</span>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={parcelas}
                    onChange={(e) => setParcelas(parseInt(e.target.value))}
                  >
                    {Array.from({ length: maxParcelas - 1 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                  <span className="text-sm text-muted-foreground">
                    = {formatCurrency(simulation.valor_parcela)}/parcela
                  </span>
                </div>
                <div className="rounded-md border p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Principal</span>
                    <span>{formatCurrency(simulation.saldo_principal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Multa + Juros + Correção</span>
                    <span>{formatCurrency(simulation.multa + simulation.juros + simulation.correcao)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Encargo renegociação</span>
                    <span>{formatCurrency(simulation.encargo)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>TOTAL</span>
                    <span className="text-primary">{formatCurrency(simulation.total)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>{parcelas}x de</span>
                    <span className="text-primary">{formatCurrency(simulation.valor_parcela)}</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Accordion-like memory */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Memória de cálculo por fatura
              </summary>
              <div className="mt-2 space-y-2 pl-2">
                {simulation.memoria.map((c) => (
                  <div key={c.invoice_id} className="border rounded p-2 text-xs space-y-1">
                    <p className="font-medium">{c.invoice_id}</p>
                    {c.memoria.map((m, i) => (
                      <div key={i} className="flex justify-between text-muted-foreground">
                        <span>{m.descricao}</span>
                        <span>{formatCurrency(m.valor)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total</span>
                      <span>{formatCurrency(c.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </details>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)}>Ver Termo</Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Termo */}
        {step === 3 && (
          <div className="space-y-4">
            <div
              className="border rounded overflow-y-scroll max-h-96 text-xs"
              dangerouslySetInnerHTML={{ __html: termoHTML }}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="accept-termo"
                checked={termoAccepted}
                onCheckedChange={(v) => setTermoAccepted(v === true)}
              />
              <label htmlFor="accept-termo" className="text-sm cursor-pointer">
                Li e aceito os termos deste acordo
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={handleAccept} disabled={!termoAccepted || accepting}>
                {accepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Aceitar e Finalizar
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-lg font-semibold">Acordo realizado com sucesso!</h2>
            <p className="text-sm text-muted-foreground">
              {novasParcelas.length} parcela(s) gerada(s)
            </p>
            <div className="text-left space-y-1 max-h-48 overflow-y-auto">
              {novasParcelas.map((inv, i) => (
                <div key={inv.id} className="flex justify-between text-sm border rounded px-3 py-1.5">
                  <span>Parcela {i + 1} — Venc. {formatDate(inv.vencimento)}</span>
                  <span className="font-medium">{formatCurrency(inv.valor_original)}</span>
                </div>
              ))}
            </div>
            <Button onClick={resetAndClose}>Ver faturas</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
