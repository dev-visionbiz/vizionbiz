import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { DemandaEspecifica, DemandaStatus } from '@/domain/types'
import type { DemandaEspecificaRepository as IDemandaEspecificaRepository } from '../interfaces'

export class LocalDemandaEspecificaRepository
  extends BaseLocalStorageRepository<DemandaEspecifica>
  implements IDemandaEspecificaRepository
{
  constructor() {
    super('demandas_especificas')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<DemandaEspecifica[]> {
    return Promise.resolve(
      this.readAll().filter((d) => d.tenant_id === tenantId && d.cliente_id === clienteId)
    )
  }

  async findByStatus(tenantId: string, status: DemandaStatus): Promise<DemandaEspecifica[]> {
    return Promise.resolve(
      this.readAll().filter((d) => d.tenant_id === tenantId && d.status === status)
    )
  }
}

export const demandaEspecificaRepo = new LocalDemandaEspecificaRepository()
