import type { HistoricoStatusCliente } from '@/domain/types'
import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { HistoricoStatusClienteRepository as IHistoricoStatusClienteRepository } from '../interfaces'

export class LocalHistoricoStatusClienteRepository
  extends BaseLocalStorageRepository<HistoricoStatusCliente>
  implements IHistoricoStatusClienteRepository
{
  constructor() {
    super('historico_status_clientes')
  }

  async findByClient(tenantId: string, clientId: string): Promise<HistoricoStatusCliente[]> {
    return Promise.resolve(
      this.readAll()
        .filter((h) => h.tenant_id === tenantId && h.client_id === clientId)
        .sort((a, b) => b.data.localeCompare(a.data))
    )
  }
}
