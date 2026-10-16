import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAppPlans } from '@/data/hooks/useApps'
import { useAssinarPlano } from '@/data/hooks/useSubscriptions'
import type { App, AppInstallation, Subscription } from '@/domain/types'
import { Loader2, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const tipoLabels: Record<string, string> = {
  gratuito: 'Gratuito',
  mensal: '/mês',
  anual: '/ano',
  por_uso: 'por uso',
  por_lead: 'por lead',
}

interface Props {
  app: App
  installation: AppInstallation
  subscriptionAtiva?: Subscription | null
  open: boolean
  onClose: () => void
}

export function AssinarPlanoDialog({ app, installation, subscriptionAtiva, open, onClose }: Props) {
  const { data: plans = [] } = useAppPlans(app.id)
  const assinar = useAssinarPlano()
  const { toast } = useToast()
  const [planSelecionado, setPlanSelecionado] = useState<string>(subscriptionAtiva?.plan_id ?? '')

  function handleAssinar() {
    if (!planSelecionado) return
    assinar.mutate(
      {
        installationId: installation.id,
        planId: planSelecionado,
        appId: app.id,
        escritorioId: installation.escritorio_id,
      },
      {
        onSuccess: () => {
          toast({ title: 'Plano ativado com sucesso.' })
          onClose()
        },
        onError: () => toast({ title: 'Erro ao ativar plano.', variant: 'destructive' }),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{app.icone}</span>
            Planos — {app.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {plans.map((plan) => {
            const isAtivo = subscriptionAtiva?.plan_id === plan.id
            const isSelected = planSelecionado === plan.id
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setPlanSelecionado(plan.id)}
                className={`w-full flex items-center justify-between border rounded-lg px-4 py-3 cursor-pointer transition-colors text-left
                  ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                  <div>
                    <p className="font-medium text-sm">{plan.nome}</p>
                    {isAtivo && <Badge className="text-xs bg-green-100 text-green-800 border-transparent mt-0.5">Ativo</Badge>}
                  </div>
                </div>
                <span className="text-sm font-semibold">
                  {plan.valor === 0 || plan.valor === null
                    ? 'Gratuito'
                    : `${formatCurrency(plan.valor ?? 0)} ${tipoLabels[plan.tipo_cobranca] ?? ''}`}
                </span>
              </button>
            )
          })}
        </div>

        {plans.find((p) => p.id === planSelecionado)?.valor === null && (
          <p className="text-xs text-muted-foreground -mt-1">
            Cobrança sob demanda — o valor é definido no momento da utilização.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleAssinar}
            disabled={!planSelecionado || assinar.isPending}
          >
            {assinar.isPending
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <CreditCard className="w-4 h-4 mr-2" />}
            Ativar plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
