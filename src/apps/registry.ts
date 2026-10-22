import type { GadgetContext } from '@/domain/types'
import { CertificadosDashboardCard } from '@/apps/certificado-digital/CertificadosDashboardCard'
import { CertificadosPortalCard } from '@/apps/certificado-digital/CertificadosPortalCard'

export const embarcadoRegistry: Record<string, React.ComponentType<{ context?: GadgetContext | Record<string, unknown> }>> = {
  CertificadosDashboardCard,
  CertificadosPortalCard,
}
