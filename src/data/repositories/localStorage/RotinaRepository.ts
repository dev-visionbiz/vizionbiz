import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Rotina } from '@/domain/types'
import type { RotinaRepository as IRotinaRepository } from '../interfaces'

export class LocalRotinaRepository
  extends BaseLocalStorageRepository<Rotina>
  implements IRotinaRepository
{
  constructor() {
    super('rotinas')
  }

  async findAtivas(tenantId: string): Promise<Rotina[]> {
    return Promise.resolve(
      this.readAll().filter((r) => r.tenant_id === tenantId && r.ativo)
    )
  }
}

export const rotinaRepo = new LocalRotinaRepository()
