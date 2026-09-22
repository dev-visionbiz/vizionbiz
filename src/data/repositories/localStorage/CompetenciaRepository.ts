import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Competencia } from '@/domain/types'
import type { CompetenciaRepository as ICompetenciaRepository } from '../interfaces'

export class LocalCompetenciaRepository
  extends BaseLocalStorageRepository<Competencia>
  implements ICompetenciaRepository
{
  constructor() {
    super('competencias')
  }

  async findByObrigacao(tenantId: string, obrigacaoId: string): Promise<Competencia[]> {
    return Promise.resolve(
      this.readAll()
        .filter((c) => c.tenant_id === tenantId && c.obrigacao_id === obrigacaoId)
        .sort((a, b) => b.periodo.localeCompare(a.periodo))
    )
  }

  async findByPeriodo(tenantId: string, obrigacaoId: string, periodo: string): Promise<Competencia | null> {
    const found = this.readAll().find(
      (c) => c.tenant_id === tenantId && c.obrigacao_id === obrigacaoId && c.periodo === periodo
    )
    return Promise.resolve(found ?? null)
  }
}

export const competenciaRepo = new LocalCompetenciaRepository()
