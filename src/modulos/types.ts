import type { FolderType, Vocabulario, AppManifesto, AppSlotSlug, AppEscopoSlug, AppEventoTipo, AppPlanDef } from '@/domain/types'

export type { AppManifesto, AppSlotSlug, AppEscopoSlug, AppEventoTipo, AppPlanDef }

export interface PastaTemplate {
  nome: string
  tipo: FolderType | string
}

export interface ModuloManifest {
  slug: string
  nome: string
  pastasDefault: PastaTemplate[]
  vocabulario: Vocabulario
  // extensão App Store — opcional para módulos legados
  app?: AppManifesto
}
