import { useAppInstallations } from '@/data/hooks/useApps'
import type { AppSlotSlug } from '@/domain/types'

interface SlotRendererProps {
  slot: AppSlotSlug
  escritorioId: string
  // contexto passado para o componente do slot
  context?: Record<string, unknown>
  // map de appSlug → componente React
  registry: Partial<Record<string, React.ComponentType<{ context?: Record<string, unknown> }>>>
}

/**
 * Renderiza, em ordem, os componentes de apps instalados que declaram o slot informado.
 * Apps não instalados ou sem registro no registry são ignorados silenciosamente.
 */
export function SlotRenderer({ slot, escritorioId, context, registry }: SlotRendererProps) {
  const { data: instalacoes = [] } = useAppInstallations(escritorioId)

  const ativas = instalacoes.filter((i) => i.status === 'ativa')

  return (
    <>
      {ativas.map((inst) => {
        const Comp = registry[inst.app_id] ?? registry[inst.app_id]
        if (!Comp) return null
        return (
          <div key={inst.id}>
            <Comp context={context} />
          </div>
        )
      })}
    </>
  )
}
