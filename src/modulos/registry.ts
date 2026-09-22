import { moduloContabil } from '@/modulos/contabil/manifest'
import type { ModuloManifest, PastaTemplate } from '@/modulos/types'

const MODULOS: ModuloManifest[] = [moduloContabil]

export function getModulo(slug: string): ModuloManifest | undefined {
  return MODULOS.find((m) => m.slug === slug)
}

// Retorna pastas padrão dos módulos ativos.
// Fallback para contábil quando modulos não está definido (retrocompatibilidade).
export function getPastasDefault(modulos?: string[]): PastaTemplate[] {
  const slugs = modulos?.length ? modulos : ['contabil']
  return slugs.flatMap((slug) => getModulo(slug)?.pastasDefault ?? [])
}
