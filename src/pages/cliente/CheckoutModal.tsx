import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useUpdateInvoice } from '@/data/hooks/useInvoices'
import { useCreatePayment } from '@/data/hooks/usePayments'
import { MockGateway } from '@/data/adapters/PaymentGatewayAdapter'
import type { Invoice } from '@/domain/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Copy, Check, Loader2 } from 'lucide-react'
import { RenegociacaoWizard } from './RenegociacaoWizard'

const gateway = new MockGateway()

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  invoice: Invoice
  valorAtualizado: number
  tenantId: string
  clientId: string
}

interface PixData {
  qrCode: string
  copiaCola: string
  gatewayRef: string
}

interface BoletoData {
  linhaDigitavel: string
  gatewayRef: string
}

export function CheckoutModal({ open, onClose, invoice, valorAtualizado, tenantId, clientId }: CheckoutModalProps) {
  const [pix, setPix] = useState<PixData | null>(null)
  const [boleto, setBoleto] = useState<BoletoData | null>(null)
  const [loadingPix, setLoadingPix] = useState(false)
  const [loadingBoleto, setLoadingBoleto] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [copiedPix, setCopiedPix] = useState(false)
  const [copiedBoleto, setCopiedBoleto] = useState(false)
  const [showRenegociacao, setShowRenegociacao] = useState(false)

  const updateInvoice = useUpdateInvoice()
  const createPayment = useCreatePayment()
  const { toast } = useToast()

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

  async function simulatePay(gatewayRef: string) {
    setSimulating(true)
    try {
      const result = await gateway.simulateWebhook(gatewayRef)
      await updateInvoice.mutateAsync({ id: invoice.id, data: { status: 'paga' } })
      await createPayment.mutateAsync({
        id: uuidv4(),
        invoice_id: invoice.id,
        valor: valorAtualizado,
        metodo: pix ? 'pix' : 'boleto',
        pago_em: result.paidAt,
        gateway_ref: result.gatewayRef,
      })
      toast({ title: 'Pagamento confirmado!' })
      onClose()
    } catch {
      toast({ title: 'Erro ao simular pagamento', variant: 'destructive' })
    } finally {
      setSimulating(false)
    }
  }

  function copyToClipboard(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  if (showRenegociacao) {
    return (
      <RenegociacaoWizard
        open={open}
        onClose={() => {
          setShowRenegociacao(false)
          onClose()
        }}
        tenantId={tenantId}
        clientId={clientId}
        preSelectedInvoiceId={invoice.id}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento — {invoice.competencia}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-2">
          Vencimento: {formatDate(invoice.vencimento)} &nbsp;|&nbsp;
          Valor: <span className="font-semibold text-foreground">{formatCurrency(valorAtualizado)}</span>
        </div>

        <Tabs
          defaultValue="pix"
          onValueChange={(v) => {
            if (v === 'pix') loadPix()
            if (v === 'boleto') loadBoleto()
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="pix" className="flex-1" onClick={loadPix}>Pix</TabsTrigger>
            <TabsTrigger value="boleto" className="flex-1" onClick={loadBoleto}>Boleto</TabsTrigger>
            <TabsTrigger value="renegociar" className="flex-1">Renegociar</TabsTrigger>
          </TabsList>

          <TabsContent value="pix" className="space-y-4 mt-4">
            {loadingPix ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : pix ? (
              <>
                <div className="flex justify-center">
                  <img src={pix.qrCode} alt="QR Code Pix" className="w-40 h-40 rounded border" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Copia e cola:</p>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded truncate">{pix.copiaCola}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(pix.copiaCola, setCopiedPix)}
                    >
                      {copiedPix ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => simulatePay(pix.gatewayRef)}
                  disabled={simulating}
                >
                  {simulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Simular pagamento
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={loadPix}>Gerar QR Code</Button>
            )}
          </TabsContent>

          <TabsContent value="boleto" className="space-y-4 mt-4">
            {loadingBoleto ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : boleto ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Linha digitável:</p>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded break-all">{boleto.linhaDigitavel}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(boleto.linhaDigitavel, setCopiedBoleto)}
                    >
                      {copiedBoleto ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => simulatePay(boleto.gatewayRef)}
                  disabled={simulating}
                >
                  {simulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Simular pagamento
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={loadBoleto}>Gerar Boleto</Button>
            )}
          </TabsContent>

          <TabsContent value="renegociar" className="mt-4">
            <div className="text-sm text-muted-foreground mb-4">
              Agrupe faturas vencidas em um acordo de parcelamento.
            </div>
            <Button className="w-full" onClick={() => setShowRenegociacao(true)}>
              Iniciar Renegociação
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
