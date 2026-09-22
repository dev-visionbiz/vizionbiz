import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Renegotiation } from '@/domain/types'
import type { RenegotiationRepository as IRenegotiationRepository } from '../interfaces'

export class LocalRenegotiationRepository
  extends BaseLocalStorageRepository<Renegotiation>
  implements IRenegotiationRepository
{
  constructor() {
    super('renegotiations')
  }

  async findByClient(tenantId: string, clientId: string): Promise<Renegotiation[]> {
    return Promise.resolve(
      this.readAll().filter((r) => r.tenant_id === tenantId && r.client_id === clientId)
    )
  }
}
