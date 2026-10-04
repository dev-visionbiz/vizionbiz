import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Loader2, Copy, Check, QrCode, FileText } from 'lucide-react'
import { useUpdateInvoice } from '@/data/hooks/useInvoices'
import { useCreatePayment } from '@/data/hooks/usePayments'
import { MockGateway } from '@/data/adapters/PaymentGatewayAdapter'
import type { Invoice } from '@/domain/types'
import { formatCurrency } from '@/lib/utils'

const gateway = new MockGateway()

interface PixData { qrCode: string; copiaCola: string; gatewayRef: string }
interface BoletoData { linhaDigitavel: string; gatewayRef: string }

interface PublicCheckoutProps {
  invoice: Invoice
  valorAtualizado: number
  onPago: () => void
}

export function PublicCheckout({ invoice, valorAtualizado, onPago }: PublicCheckoutProps) {
  const [pix, setPix] = useState<PixData | null>(null)
  const [boleto, setBoleto] = useState<BoletoData | null>(null)
  const [loadingPix, setLoadingPix] = useState(false)
  const [loadingBoleto, setLoadingBoleto] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [copiedPix, setCopiedPix] = useState(false)
  const [copiedBoleto, setCopiedBoleto] = useState(false)
  const [activeTab, setActiveTab] = useState('pix')

  const updateInvoice = useUpdateInvoice()
  const createPayment = useCreatePayment()

  async function loadPix() {
    if (pix) return
    setLoadingPix(true)
    try {
      const data = await gateway.createPixPayment(invoice.id, valorAtualizado)
      setPix(data)
    } finally {
      setLoadingPix(false)
    }
  }

  async function loadBoleto() {
    if (boleto) return
    setLoadingBoleto(true)
    try {
      const data = await gateway.createBoletoPayment(invoice.id, valorAtualizado)
      setBoleto(data)
    } finally {
      setLoadingBoleto(false)
    }
  }

  async function confirmarPagamento(gatewayRef: string, metodo: 'pix' | 'boleto') {
    setSimulating(true)
    try {
      const result = await gateway.simulateWebhook(gatewayRef)
      await updateInvoice.mutateAsync({ id: invoice.id, data: { status: 'paga' } })
      await createPayment.mutateAsync({
        id: uuidv4(),
        invoice_id: invoice.id,
        valor: valorAtualizado,
        metodo,
        pago_em: result.paidAt,
        gateway_ref: result.gatewayRef,
      })
      onPago()
    } finally {
      setSimulating(false)
    }
  }

  function copiar(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div className="border rounded-xl p-4 bg-card space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Competência {invoice.competencia}</span>
        <span className="font-bold text-base">{formatCurrency(valorAtualizado)}</span>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v)
          if (v === 'pix') loadPix()
          if (v === 'boleto') loadBoleto()
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="pix" className="flex-1" onClick={loadPix}>
            <QrCode className="h-3.5 w-3.5 mr-1.5" /> Pix
          </TabsTrigger>
          <TabsTrigger value="boleto" className="flex-1" onClick={loadBoleto}>
            <FileText className="h-3.5 w-3.5 mr-1.5" /> Boleto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pix" className="mt-3 space-y-3">
          {loadingPix ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pix ? (
            <>
              <div className="flex justify-center">
                <img src={pix.qrCode} alt="QR Code Pix" className="w-36 h-36 rounded-lg border" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Copia e cola:</p>
                <div className="flex gap-2 items-start">
                  <code className="flex-1 text-xs bg-muted p-2 rounded break-all leading-relaxed">
                    {pix.copiaCola}
                  </code>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => copiar(pix.copiaCola, setCopiedPix)}>
                    {copiedPix ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={() => confirmarPagamento(pix.gatewayRef, 'pix')} disabled={simulating}>
                {simulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {simulating ? 'Confirmando...' : 'Confirmar pagamento Pix'}
              </Button>
            </>
          ) : (
            <Button className="w-full" variant="outline" onClick={loadPix}>
              Gerar QR Code
            </Button>
          )}
        </TabsContent>

        <TabsContent value="boleto" className="mt-3 space-y-3">
          {loadingBoleto ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : boleto ? (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Linha digitável:</p>
                <div className="flex gap-2 items-start">
                  <code className="flex-1 text-xs bg-muted p-2 rounded break-all leading-relaxed">
                    {boleto.linhaDigitavel}
                  </code>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => copiar(boleto.linhaDigitavel, setCopiedBoleto)}>
                    {copiedBoleto ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={() => confirmarPagamento(boleto.gatewayRef, 'boleto')} disabled={simulating}>
                {simulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {simulating ? 'Confirmando...' : 'Confirmar pagamento Boleto'}
              </Button>
            </>
          ) : (
            <Button className="w-full" variant="outline" onClick={loadBoleto}>
              Gerar Boleto
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
