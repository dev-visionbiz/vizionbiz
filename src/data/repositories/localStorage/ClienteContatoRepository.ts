import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { ClienteContato } from '@/domain/types'

export class LocalClienteContatoRepository extends BaseLocalStorageRepository<ClienteContato> {
  constructor() {
    super('cliente_contatos')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ClienteContato[]> {
    return Promise.resolve(
      this.readAll().filter(
        (c) => c.tenant_id === tenantId && c.cliente_id === clienteId
      )
    )
  }
}

export const clienteContatoRepo = new LocalClienteContatoRepository()
