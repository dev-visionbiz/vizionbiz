import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { FichaBloco } from '@/domain/types'
import type { FichaBlocoRepository as IFichaBlocoRepository } from '../interfaces'

export class LocalFichaBlocoRepository
  extends BaseLocalStorageRepository<FichaBloco>
  implements IFichaBlocoRepository
{
  constructor() {
    super('ficha_blocos')
  }

  async findByClient(tenantId: string, clientId: string): Promise<FichaBloco[]> {
    return Promise.resolve(
      this.readAll()
        .filter((b) => b.tenant_id === tenantId && b.client_id === clientId)
        .sort((a, b) => a.ordem - b.ordem)
    )
  }
}
