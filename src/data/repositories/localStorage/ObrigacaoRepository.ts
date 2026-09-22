import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Obrigacao } from '@/domain/types'
import type { ObrigacaoRepository as IObrigacaoRepository } from '../interfaces'

export class LocalObrigacaoRepository
  extends BaseLocalStorageRepository<Obrigacao>
  implements IObrigacaoRepository
{
  constructor() {
    super('obrigacoes')
  }

  async findAtivas(tenantId: string): Promise<Obrigacao[]> {
    return Promise.resolve(
      this.readAll().filter((o) => o.tenant_id === tenantId && o.ativo)
    )
  }
}

export const obrigacaoRepo = new LocalObrigacaoRepository()
