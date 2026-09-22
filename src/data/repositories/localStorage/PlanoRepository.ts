import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Plano } from '@/domain/types'
import type { PlanoRepository as IPlanoRepository } from '../interfaces'

export class LocalPlanoRepository
  extends BaseLocalStorageRepository<Plano>
  implements IPlanoRepository
{
  constructor() {
    super('planos')
  }

  async findAtivos(tenantId: string): Promise<Plano[]> {
    return Promise.resolve(
      this.readAll().filter((p) => p.tenant_id === tenantId && p.ativo)
    )
  }
}
