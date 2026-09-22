import type { FolderType, Vocabulario } from '@/domain/types'

export interface PastaTemplate {
  nome: string
  tipo: FolderType | string
}

export interface ModuloManifest {
  slug: string
  nome: string
  pastasDefault: PastaTemplate[]
  vocabulario: Vocabulario
}
