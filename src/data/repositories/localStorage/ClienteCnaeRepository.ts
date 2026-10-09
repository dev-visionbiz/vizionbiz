import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { ClienteCnae } from '@/domain/types'

export class LocalClienteCnaeRepository extends BaseLocalStorageRepository<ClienteCnae> {
  constructor() {
    super('cliente_cnaes')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ClienteCnae[]> {
    return Promise.resolve(
      this.readAll().filter(
        (c) => c.tenant_id === tenantId && c.cliente_id === clienteId
      )
    )
  }

  async replaceAllByCliente(tenantId: string, clienteId: string, novos: ClienteCnae[]): Promise<ClienteCnae[]> {
    const sem = this.readAll().filter(
      (c) => !(c.tenant_id === tenantId && c.cliente_id === clienteId)
    )
    this.writeAll([...sem, ...novos])
    return Promise.resolve(novos)
  }
}

export const clienteCnaeRepo = new LocalClienteCnaeRepository()
