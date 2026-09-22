import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'
import type { Invoice } from '@/domain/types'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CobrancaDocumentoModalProps {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  nomeDocumento: string
}

export function CobrancaDocumentoModal({ open, onClose, invoice, nomeDocumento }: CobrancaDocumentoModalProps) {
  const navigate = useNavigate()

  function handlePagar() {
    onClose()
    navigate('/portal/financeiro?acao=pagar')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <CreditCard className="h-5 w-5" />
            Download bloqueado — Cobrança pendente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O documento <span className="font-medium text-foreground">"{nomeDocumento}"</span> possui
            uma cobrança vinculada que precisa ser paga para liberar o download.
          </p>

          {invoice && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Competência</span>
                <span className="font-medium">{invoice.competencia}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Vencimento</span>
                <span className="font-medium">{formatDate(invoice.vencimento)}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t pt-2 mt-2">
                <span className="font-semibold">Valor</span>
                <span className="font-bold text-amber-600 text-base">
                  {formatCurrency(invoice.valor_original)}
                </span>
              </div>
            </div>
          )}

          {!invoice && (
            <p className="text-sm text-destructive">
              Cobrança não encontrada. Entre em contato com o escritório.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {invoice && (
            <Button onClick={handlePagar}>
              Pagar agora
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
