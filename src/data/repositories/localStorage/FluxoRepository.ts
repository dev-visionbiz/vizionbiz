import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Fluxo } from '@/domain/types'
import type { FluxoRepository as IFluxoRepository } from '../interfaces'

export class LocalFluxoRepository
  extends BaseLocalStorageRepository<Fluxo>
  implements IFluxoRepository
{
  constructor() {
    super('fluxos')
  }

  async findAtivos(tenantId: string): Promise<Fluxo[]> {
    return Promise.resolve(
      this.readAll().filter((f) => f.tenant_id === tenantId && f.ativo)
    )
  }
}

export const fluxoRepo = new LocalFluxoRepository()
