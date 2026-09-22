import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Lock } from 'lucide-react'
import type { Invoice, BillingPolicy, ChargeCalculation } from '@/domain/types'
import { formatCurrency, formatDate } from '@/lib/utils'

interface BloqueioModalProps {
  open: boolean
  onClose: () => void
  faturas: Invoice[]
  calculos: ChargeCalculation[]
}

export function BloqueioModal({ open, onClose, faturas, calculos }: BloqueioModalProps) {
  const navigate = useNavigate()

  const total = calculos.reduce((s, c) => s + c.total, 0)

  function handlePagar() {
    onClose()
    navigate('/portal/financeiro?acao=pagar')
  }

  function handleRenegociar() {
    onClose()
    navigate('/portal/financeiro?acao=renegociar')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Lock className="h-5 w-5" />
            Acesso bloqueado — Regularize sua situação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para acessar este documento, regularize as faturas vencidas abaixo.
          </p>

          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faturas.map((inv, i) => {
                  const calc = calculos.find((c) => c.invoice_id === inv.id)
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.competencia}</TableCell>
                      <TableCell>{formatDate(inv.vencimento)}</TableCell>
                      <TableCell className="font-semibold text-destructive">
                        {calc ? formatCurrency(calc.total) : formatCurrency(inv.valor_original)}
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">Total geral</TableCell>
                  <TableCell className="font-bold text-destructive text-lg">
                    {formatCurrency(total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-2">
            {faturas.map((inv) => {
              const calc = calculos.find((c) => c.invoice_id === inv.id)
              return (
                <div key={inv.id} className="rounded-xl border bg-card p-3 shadow-sm space-y-1">
                  <p className="font-semibold text-sm">{inv.competencia}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatDate(inv.vencimento)}</span>
                    <span className="font-semibold text-destructive">
                      {calc ? formatCurrency(calc.total) : formatCurrency(inv.valor_original)}
                    </span>
                  </div>
                </div>
              )
            })}
            <div className="rounded-xl border bg-muted p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">Total geral</span>
                <span className="font-bold text-destructive">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleRenegociar}>
            Renegociar
          </Button>
          <Button onClick={handlePagar}>
            Pagar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
