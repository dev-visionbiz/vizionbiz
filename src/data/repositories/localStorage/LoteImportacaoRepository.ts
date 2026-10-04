import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { LoteImportacaoRepository } from '@/data/repositories/interfaces'
import type { LoteImportacao } from '@/domain/types'

class LocalLoteImportacaoRepository
  extends BaseLocalStorageRepository<LoteImportacao>
  implements LoteImportacaoRepository
{
  constructor() {
    super('lotes_importacao')
  }

  async findByTenant(tenantId: string): Promise<LoteImportacao[]> {
    return this.readAll().filter(
      (l) => l.tenant_id === tenantId && !l.deleted_at
    )
  }

  override async findAll(tenantId: string): Promise<LoteImportacao[]> {
    return this.findByTenant(tenantId)
  }
}

export const loteRepo = new LocalLoteImportacaoRepository()
