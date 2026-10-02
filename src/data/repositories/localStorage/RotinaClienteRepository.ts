import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { RotinaCliente } from '@/domain/types'
import type { RotinaClienteRepository as IRotinaClienteRepository } from '../interfaces'

export class LocalRotinaClienteRepository
  extends BaseLocalStorageRepository<RotinaCliente>
  implements IRotinaClienteRepository
{
  constructor() {
    super('rotina_clientes')
  }

  async findByRotina(tenantId: string, rotinaId: string): Promise<RotinaCliente[]> {
    return Promise.resolve(
      this.readAll().filter((r) => r.tenant_id === tenantId && r.rotina_id === rotinaId)
    )
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<RotinaCliente[]> {
    return Promise.resolve(
      this.readAll().filter((r) => r.tenant_id === tenantId && r.cliente_id === clienteId)
    )
  }

  async findAtivos(tenantId: string, rotinaId: string): Promise<RotinaCliente[]> {
    return Promise.resolve(
      this.readAll().filter(
        (r) => r.tenant_id === tenantId && r.rotina_id === rotinaId && r.ativo
      )
    )
  }
}

export const rotinaClienteRepo = new LocalRotinaClienteRepository()
