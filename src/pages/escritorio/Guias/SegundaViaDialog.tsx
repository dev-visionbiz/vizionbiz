import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSolicitarSegundaVia } from '@/data/hooks/useGuias'
import { formatDate, cn } from '@/lib/utils'
import type { GuiaRecolhimento } from '@/domain/types'
import { TIPO_GUIA_CONFIG, SEGUNDA_VIA_CONFIG } from './guiasConfig'
import { FileText, Send, CheckCircle2, Clock } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Props {
  guia: GuiaRecolhimento
  open: boolean
  onClose: () => void
  userId: string
}

export function SegundaViaDialog({ guia, open, onClose, userId }: Props) {
  const { mutateAsync, isPending } = useSolicitarSegundaVia()
  const { toast } = useToast()
  const tipoConfig = TIPO_GUIA_CONFIG[guia.tipo]
  const statusSVia = guia.segunda_via_status
  const config = SEGUNDA_VIA_CONFIG[statusSVia]

  async function solicitar() {
    try {
      await mutateAsync({ id: guia.id })
      toast({ title: 'Solicitação de 2ª via registrada!' })
      onClose()
    } catch {
      toast({ title: 'Erro ao registrar solicitação', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Segunda Via
          </DialogTitle>
        </DialogHeader>

        {/* Resumo da guia */}
        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-0.5">
          <p className="font-medium">{guia.descricao}</p>
          <p className="text-muted-foreground">{tipoConfig.label} · Comp. {guia.competencia}</p>
        </div>

        {/* Status atual */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant="outline" className={cn('text-sm', config.cor)}>
              {config.label}
            </Badge>
          </div>

          {statusSVia === 'nao_solicitada' && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">Solicitar segunda via</p>
                  <p className="text-muted-foreground">
                    Ao solicitar, a equipe do escritório será notificada para providenciar a 2ª via
                    da guia junto ao órgão emissor. Quando disponível, o arquivo será anexado aqui.
                  </p>
                </div>
              </div>
            </div>
          )}

          {statusSVia === 'solicitada' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
                <Clock className="h-4 w-4" />
                Solicitação em andamento
              </div>
              <p className="text-sm text-muted-foreground">
                A solicitação foi registrada em {guia.segunda_via_solicitada_em ? formatDate(guia.segunda_via_solicitada_em) : '–'}.
                Aguardando disponibilização pelo órgão emissor.
              </p>
            </div>
          )}

          {statusSVia === 'disponivel' && (
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Segunda via disponível
              </div>
              <p className="text-sm text-muted-foreground">
                O arquivo da 2ª via está disponível. Entre em contato com o escritório para receber
                o documento.
              </p>
            </div>
          )}

          {statusSVia === 'enviada' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                <Send className="h-4 w-4" />
                Segunda via enviada ao cliente
              </div>
              <p className="text-sm text-muted-foreground">
                O documento foi enviado. Verifique seu e-mail ou entre em contato com o escritório.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {statusSVia === 'nao_solicitada' && (
            <Button onClick={solicitar} disabled={isPending} className="gap-2">
              <FileText className="h-4 w-4" />
              {isPending ? 'Solicitando...' : 'Solicitar 2ª Via'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
