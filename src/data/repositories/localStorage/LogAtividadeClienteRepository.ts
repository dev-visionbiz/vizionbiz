import type { LogAtividadeCliente } from '@/domain/types'
import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { LogAtividadeClienteRepository as IRepo } from '../interfaces'

export class LocalLogAtividadeClienteRepository
  extends BaseLocalStorageRepository<LogAtividadeCliente>
  implements IRepo
{
  constructor() {
    super('log_atividade_cliente')
  }

  async findByClient(tenantId: string, clientId: string): Promise<LogAtividadeCliente[]> {
    return Promise.resolve(
      this.readAll()
        .filter((e) => e.tenant_id === tenantId && e.client_id === clientId)
        .sort((a, b) => b.em.localeCompare(a.em))
    )
  }
}
