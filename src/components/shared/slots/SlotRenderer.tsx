import { useAppInstallations, useAppVersion } from '@/data/hooks/useApps'
import type { AppSlotSlug, GadgetContext, GadgetSpec } from '@/domain/types'
import { ConnectedGadget } from './ConnectedGadget'
import { EmbedGadget } from './EmbedGadget'

interface SlotRendererProps {
  slot: AppSlotSlug
  escritorioId: string
  context?: GadgetContext | Record<string, unknown>
  // registry: componentName → React component (para apps embarcados)
  registry?: Partial<Record<string, React.ComponentType<{ context?: GadgetContext | Record<string, unknown> }>>>
}

// Componente filho por instalação — permite chamar hooks por item sem violar regras de hooks
function InstalledAppGadgets({
  appId,
  slot,
  context,
  registry,
}: {
  appId: string
  slot: AppSlotSlug
  context?: GadgetContext | Record<string, unknown>
  registry?: Partial<Record<string, React.ComponentType<{ context?: GadgetContext | Record<string, unknown> }>>>
}) {
  const { data: version } = useAppVersion(appId)
  if (!version) return null

  const gadgets: GadgetSpec[] = (version.manifesto.gadgets ?? []).filter(
    (g) => g.slot === slot
  )
  if (gadgets.length === 0) return null

  return (
    <>
      {gadgets.map((gadget, i) => {
        // embarcado: componente registrado em código
        if (gadget.component) {
          const Comp = registry?.[gadget.component]
          if (!Comp) return null
          return <Comp key={i} context={context} />
        }
        // conectado: busca dados de endpoint externo
        if (gadget.dataEndpoint) {
          return (
            <ConnectedGadget
              key={i}
              spec={gadget}
              appNome={version.manifesto.nome}
              context={context}
            />
          )
        }
        // embed: iframe autenticado por JWT
        if (gadget.embedUrl) {
          return <EmbedGadget key={i} spec={gadget} context={context} />
        }
        return null
      })}
    </>
  )
}

/**
 * Renderiza, em ordem, os gadgets de apps instalados que declaram o slot informado.
 * Suporta os três tipos: embarcado (registry), conectado (ConnectedGadget) e embed (EmbedGadget).
 */
export function SlotRenderer({ slot, escritorioId, context, registry }: SlotRendererProps) {
  const { data: instalacoes = [] } = useAppInstallations(escritorioId)
  const ativas = instalacoes.filter((i) => i.status === 'ativa')

  return (
    <>
      {ativas.map((inst) => (
        <InstalledAppGadgets
          key={inst.id}
          appId={inst.app_id}
          slot={slot}
          context={context}
          registry={registry}
        />
      ))}
    </>
  )
}
