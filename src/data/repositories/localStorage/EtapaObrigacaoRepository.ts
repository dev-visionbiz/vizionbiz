import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { EtapaObrigacao } from '@/domain/types'
import type { EtapaObrigacaoRepository as IEtapaRepository } from '../interfaces'

export class LocalEtapaObrigacaoRepository
  extends BaseLocalStorageRepository<EtapaObrigacao>
  implements IEtapaRepository
{
  constructor() {
    super('etapas_obrigacao')
  }

  async findByObrigacao(tenantId: string, obrigacaoId: string): Promise<EtapaObrigacao[]> {
    return Promise.resolve(
      this.readAll()
        .filter((e) => e.tenant_id === tenantId && e.obrigacao_id === obrigacaoId)
        .sort((a, b) => a.ordem - b.ordem)
    )
  }
}

export const etapaObrigacaoRepo = new LocalEtapaObrigacaoRepository()
