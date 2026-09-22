import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { ContratoItem } from '@/domain/types'
import type { ContratoItemRepository as IContratoItemRepository } from '../interfaces'

export class LocalContratoItemRepository
  extends BaseLocalStorageRepository<ContratoItem>
  implements IContratoItemRepository
{
  constructor() {
    super('contrato_items')
  }

  async findByContrato(tenantId: string, contratoId: string): Promise<ContratoItem[]> {
    return Promise.resolve(
      this.readAll().filter((i) => i.tenant_id === tenantId && i.contrato_id === contratoId)
    )
  }
}
