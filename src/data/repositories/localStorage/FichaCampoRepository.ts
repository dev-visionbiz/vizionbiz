import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { FichaCampo } from '@/domain/types'
import type { FichaCampoRepository as IFichaCampoRepository } from '../interfaces'

export class LocalFichaCampoRepository
  extends BaseLocalStorageRepository<FichaCampo>
  implements IFichaCampoRepository
{
  constructor() {
    super('ficha_campos')
  }

  async findByBloco(tenantId: string, blocoId: string): Promise<FichaCampo[]> {
    return Promise.resolve(
      this.readAll()
        .filter((c) => c.tenant_id === tenantId && c.bloco_id === blocoId)
        .sort((a, b) => a.ordem - b.ordem)
    )
  }

  async deleteByBloco(blocoId: string): Promise<void> {
    this.writeAll(this.readAll().filter((c) => c.bloco_id !== blocoId))
    return Promise.resolve()
  }
}
