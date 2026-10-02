import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Ciclo } from '@/domain/types'
import type { CicloRepository as ICicloRepository } from '../interfaces'

export class LocalCicloRepository
  extends BaseLocalStorageRepository<Ciclo>
  implements ICicloRepository
{
  constructor() {
    super('ciclos')
  }

  async findByRotina(tenantId: string, rotinaId: string): Promise<Ciclo[]> {
    return Promise.resolve(
      this.readAll().filter((c) => c.tenant_id === tenantId && c.rotina_id === rotinaId)
    )
  }

  async findByPeriodo(
    tenantId: string,
    rotinaId: string,
    periodo: string
  ): Promise<Ciclo | null> {
    const item = this.readAll().find(
      (c) => c.tenant_id === tenantId && c.rotina_id === rotinaId && c.periodo === periodo
    )
    return Promise.resolve(item ?? null)
  }
}

export const cicloRepo = new LocalCicloRepository()
