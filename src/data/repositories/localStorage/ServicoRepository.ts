import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Servico } from '@/domain/types'
import type { ServicoRepository as IServicoRepository } from '../interfaces'

export class LocalServicoRepository
  extends BaseLocalStorageRepository<Servico>
  implements IServicoRepository
{
  constructor() {
    super('servicos')
  }

  async findAtivos(tenantId: string): Promise<Servico[]> {
    return Promise.resolve(
      this.readAll().filter((s) => s.tenant_id === tenantId && s.ativo)
    )
  }
}
