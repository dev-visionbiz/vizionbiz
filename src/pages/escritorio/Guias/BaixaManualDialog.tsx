import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBaixarGuia } from '@/data/hooks/useGuias'
import { formatCurrency } from '@/lib/utils'
import type { GuiaRecolhimento } from '@/domain/types'
import { TIPO_GUIA_CONFIG } from './guiasConfig'
import { CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const schema = z.object({
  pago_em: z.string().min(1, 'Informe a data de pagamento'),
  pago_valor: z.coerce.number().positive('Informe o valor pago'),
  observacoes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  guia: GuiaRecolhimento
  open: boolean
  onClose: () => void
  userId: string
}

export function BaixaManualDialog({ guia, open, onClose, userId }: Props) {
  const { mutateAsync, isPending } = useBaixarGuia()
  const { toast } = useToast()
  const tipoConfig = TIPO_GUIA_CONFIG[guia.tipo]

  const valorTotal = guia.valor + (guia.valor_multa ?? 0) + (guia.valor_juros ?? 0)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      pago_em: format(new Date(), 'yyyy-MM-dd'),
      pago_valor: valorTotal,
    },
  })

  async function onSubmit(data: FormData) {
    try {
      await mutateAsync({
        id: guia.id,
        pago_em: data.pago_em,
        pago_valor: data.pago_valor,
        pago_por: userId,
        observacoes: data.observacoes,
      })
      toast({ title: 'Pagamento registrado com sucesso!' })
      reset()
      onClose()
    } catch {
      toast({ title: 'Erro ao registrar pagamento', variant: 'destructive' })
    }
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Registrar Pagamento
          </DialogTitle>
        </DialogHeader>

        {/* Resumo da guia */}
        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <p className="font-medium">{guia.descricao}</p>
          <p className="text-muted-foreground">{tipoConfig.label} · Comp. {guia.competencia}</p>
          <div className="flex justify-between pt-1">
            <span className="text-muted-foreground">Valor original</span>
            <span className="font-medium">{formatCurrency(guia.valor)}</span>
          </div>
          {(guia.valor_multa || guia.valor_juros) && (
            <div className="flex justify-between text-red-600">
              <span>Encargos</span>
              <span>+{formatCurrency((guia.valor_multa ?? 0) + (guia.valor_juros ?? 0))}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(valorTotal)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Data do Pagamento *</Label>
            <Input
              type="date"
              {...register('pago_em')}
              className={errors.pago_em ? 'border-destructive' : ''}
            />
            {errors.pago_em && <p className="text-xs text-destructive">{errors.pago_em.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Valor Pago (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              {...register('pago_valor')}
              className={errors.pago_valor ? 'border-destructive' : ''}
            />
            {errors.pago_valor && <p className="text-xs text-destructive">{errors.pago_valor.message}</p>}
            <p className="text-xs text-muted-foreground">
              Pode diferir do valor original em caso de encargos ou descontos.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              placeholder="Ex: Pago via PIX — comprovante enviado ao cliente"
              rows={2}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Para anexar comprovante, acesse o detalhe da guia após o registro.
          </p>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {isPending ? 'Salvando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
