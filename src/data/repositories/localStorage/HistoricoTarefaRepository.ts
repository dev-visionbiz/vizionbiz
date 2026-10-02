import type { HistoricoTarefa } from '@/domain/types'
import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { HistoricoTarefaRepository as IRepo } from '../interfaces'

export class LocalHistoricoTarefaRepository
  extends BaseLocalStorageRepository<HistoricoTarefa>
  implements IRepo
{
  constructor() {
    super('historico_tarefa')
  }

  async findByTarefa(tenantId: string, tarefaId: string): Promise<HistoricoTarefa[]> {
    return Promise.resolve(
      this.readAll()
        .filter((e) => e.tenant_id === tenantId && e.tarefa_id === tarefaId)
        .map((e) => ({
          ...e,
          conteudo: typeof e.conteudo === 'string' ? e.conteudo : undefined,
        }))
        .sort((a, b) => a.criado_em.localeCompare(b.criado_em))
    )
  }
}
