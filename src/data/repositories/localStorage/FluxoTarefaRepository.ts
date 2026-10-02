import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { FluxoTarefa } from '@/domain/types'
import type { FluxoTarefaRepository as IFluxoTarefaRepository } from '../interfaces'

export class LocalFluxoTarefaRepository
  extends BaseLocalStorageRepository<FluxoTarefa>
  implements IFluxoTarefaRepository
{
  constructor() {
    super('fluxo_tarefas')
  }

  async findByFluxo(tenantId: string, fluxoId: string): Promise<FluxoTarefa[]> {
    return Promise.resolve(
      this.readAll()
        .filter((t) => t.tenant_id === tenantId && t.fluxo_id === fluxoId)
        .sort((a, b) => a.ordem - b.ordem)
    )
  }
}

export const fluxoTarefaRepo = new LocalFluxoTarefaRepository()
