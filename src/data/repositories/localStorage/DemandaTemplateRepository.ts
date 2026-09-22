import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { DemandaTemplate } from '@/domain/types'
import type { DemandaTemplateRepository as IDemandaTemplateRepository } from '../interfaces'

export class LocalDemandaTemplateRepository
  extends BaseLocalStorageRepository<DemandaTemplate>
  implements IDemandaTemplateRepository
{
  constructor() {
    super('demanda_templates')
  }

  async findAtivas(tenantId: string): Promise<DemandaTemplate[]> {
    return Promise.resolve(
      this.readAll().filter((t) => t.tenant_id === tenantId && t.ativo)
    )
  }
}

export const demandaTemplateRepo = new LocalDemandaTemplateRepository()
