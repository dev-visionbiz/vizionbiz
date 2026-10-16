import { moduloContabil } from '@/modulos/contabil/manifest'
import type { ModuloManifest, PastaTemplate, AppManifesto } from '@/modulos/types'

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

// Retorna o AppManifesto de um módulo, se definido.
export function getAppManifestoDoModulo(slug: string): AppManifesto | undefined {
  return getModulo(slug)?.app
}

// Lista todos os módulos que têm AppManifesto (candidatos a "apps" na loja).
export function getModulosComApp(): ModuloManifest[] {
  return MODULOS.filter((m) => !!m.app)
}
