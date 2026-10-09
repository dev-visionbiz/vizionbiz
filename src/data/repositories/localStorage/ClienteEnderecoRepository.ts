import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { ClienteEndereco } from '@/domain/types'

export class LocalClienteEnderecoRepository extends BaseLocalStorageRepository<ClienteEndereco> {
  constructor() {
    super('cliente_enderecos')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ClienteEndereco[]> {
    return Promise.resolve(
      this.readAll().filter(
        (e) => e.tenant_id === tenantId && e.cliente_id === clienteId
      )
    )
  }
}

export const clienteEnderecoRepo = new LocalClienteEnderecoRepository()
