import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Ocorrencia, OcorrenciaStatus } from '@/domain/types'
import type { OcorrenciaRepository as IOcorrenciaRepository } from '../interfaces'

export class LocalOcorrenciaRepository
  extends BaseLocalStorageRepository<Ocorrencia>
  implements IOcorrenciaRepository
{
  constructor() {
    super('ocorrencias')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<Ocorrencia[]> {
    return Promise.resolve(
      this.readAll().filter((o) => o.tenant_id === tenantId && o.cliente_id === clienteId)
    )
  }

  async findByStatus(tenantId: string, status: OcorrenciaStatus): Promise<Ocorrencia[]> {
    return Promise.resolve(
      this.readAll().filter((o) => o.tenant_id === tenantId && o.status === status)
    )
  }

  async findByLote(tenantId: string, loteId: string): Promise<Ocorrencia[]> {
    return Promise.resolve(
      this.readAll().filter((o) => o.tenant_id === tenantId && o.lote_id === loteId)
    )
  }

  async findByCiclo(tenantId: string, cicloId: string): Promise<Ocorrencia[]> {
    return Promise.resolve(
      this.readAll().filter((o) => o.tenant_id === tenantId && o.ciclo_id === cicloId)
    )
  }
}

export const ocorrenciaRepo = new LocalOcorrenciaRepository()
