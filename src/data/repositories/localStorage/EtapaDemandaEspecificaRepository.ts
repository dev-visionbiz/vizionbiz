import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { EtapaDemandaEspecifica } from '@/domain/types'
import type { EtapaDemandaEspecificaRepository as IEtapaDemandaEspecificaRepository } from '../interfaces'

export class LocalEtapaDemandaEspecificaRepository
  extends BaseLocalStorageRepository<EtapaDemandaEspecifica>
  implements IEtapaDemandaEspecificaRepository
{
  constructor() {
    super('etapas_demanda_especifica')
  }

  async findByDemanda(tenantId: string, demandaId: string): Promise<EtapaDemandaEspecifica[]> {
    return Promise.resolve(
      this.readAll()
        .filter((e) => e.tenant_id === tenantId && e.demanda_id === demandaId)
        .sort((a, b) => a.ordem - b.ordem)
    )
  }
}

export const etapaDemandaEspecificaRepo = new LocalEtapaDemandaEspecificaRepository()
