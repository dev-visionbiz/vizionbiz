import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { ServicoRealizado } from '@/domain/types'
import type { ServicoRealizadoRepository as IServicoRealizadoRepository } from '../interfaces'

export class LocalServicoRealizadoRepository
  extends BaseLocalStorageRepository<ServicoRealizado>
  implements IServicoRealizadoRepository
{
  constructor() {
    super('servicos_realizados')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ServicoRealizado[]> {
    return Promise.resolve(
      this.readAll().filter((s) => s.tenant_id === tenantId && s.cliente_id === clienteId)
    )
  }

  async findPendentes(tenantId: string): Promise<ServicoRealizado[]> {
    return Promise.resolve(
      this.readAll().filter((s) => s.tenant_id === tenantId && s.status === 'pendente_cobranca')
    )
  }

  async findByCompetencia(tenantId: string, competencia: string): Promise<ServicoRealizado[]> {
    return Promise.resolve(
      this.readAll().filter((s) => s.tenant_id === tenantId && s.competencia === competencia)
    )
  }
}

export const servicoRealizadoRepo = new LocalServicoRealizadoRepository()
