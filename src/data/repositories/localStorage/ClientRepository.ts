import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Client, ClientStatus } from '@/domain/types'
import type { ClientRepository as IClientRepository } from '../interfaces'

export class LocalClientRepository
  extends BaseLocalStorageRepository<Client>
  implements IClientRepository
{
  constructor() {
    super('clients')
  }

  async findActive(tenantId: string): Promise<Client[]> {
    return Promise.resolve(
      this.readAll().filter((c) => c.tenant_id === tenantId && c.status === 'ativo')
    )
  }

  async findByStatus(tenantId: string, status: ClientStatus): Promise<Client[]> {
    return Promise.resolve(
      this.readAll().filter((c) => c.tenant_id === tenantId && c.status === status)
    )
  }
}
