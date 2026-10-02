import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Tarefa } from '@/domain/types'
import type { TarefaRepository as ITarefaRepository } from '../interfaces'

export class LocalTarefaRepository
  extends BaseLocalStorageRepository<Tarefa>
  implements ITarefaRepository
{
  constructor() {
    super('tarefas')
  }

  async findByOcorrencia(tenantId: string, ocorrenciaId: string): Promise<Tarefa[]> {
    return Promise.resolve(
      this.readAll()
        .filter((t) => t.tenant_id === tenantId && t.ocorrencia_id === ocorrenciaId)
        .sort((a, b) => a.ordem - b.ordem)
    )
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<Tarefa[]> {
    const ocorrencias = JSON.parse(
      localStorage.getItem('vb_ocorrencias') ?? '[]'
    ) as Array<{ id: string; cliente_id?: string; tenant_id: string }>

    const ocorrenciaIds = new Set(
      ocorrencias
        .filter((o) => o.tenant_id === tenantId && o.cliente_id === clienteId)
        .map((o) => o.id)
    )

    return Promise.resolve(
      this.readAll().filter(
        (t) => t.tenant_id === tenantId && ocorrenciaIds.has(t.ocorrencia_id)
      )
    )
  }
}

export const tarefaRepo = new LocalTarefaRepository()
