import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { TarefaObrigacao } from '@/domain/types'
import type { TarefaObrigacaoRepository as ITarefaRepository } from '../interfaces'

export class LocalTarefaObrigacaoRepository
  extends BaseLocalStorageRepository<TarefaObrigacao>
  implements ITarefaRepository
{
  constructor() {
    super('tarefas_obrigacao')
  }

  async findByCompetencia(tenantId: string, competenciaId: string): Promise<TarefaObrigacao[]> {
    return Promise.resolve(
      this.readAll().filter(
        (t) => t.tenant_id === tenantId && t.competencia_id === competenciaId
      )
    )
  }

  async findByCompetenciaEtapa(tenantId: string, competenciaId: string, etapaId: string): Promise<TarefaObrigacao[]> {
    return Promise.resolve(
      this.readAll().filter(
        (t) => t.tenant_id === tenantId && t.competencia_id === competenciaId && t.etapa_id === etapaId
      )
    )
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<TarefaObrigacao[]> {
    return Promise.resolve(
      this.readAll().filter(
        (t) => t.tenant_id === tenantId && t.cliente_id === clienteId
      )
    )
  }
}

export const tarefaObrigacaoRepo = new LocalTarefaObrigacaoRepository()
