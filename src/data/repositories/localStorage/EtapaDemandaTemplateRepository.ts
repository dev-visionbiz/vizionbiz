import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { EtapaDemandaTemplate } from '@/domain/types'
import type { EtapaDemandaTemplateRepository as IEtapaDemandaTemplateRepository } from '../interfaces'

export class LocalEtapaDemandaTemplateRepository
  extends BaseLocalStorageRepository<EtapaDemandaTemplate>
  implements IEtapaDemandaTemplateRepository
{
  constructor() {
    super('etapas_demanda_template')
  }

  async findByTemplate(tenantId: string, templateId: string): Promise<EtapaDemandaTemplate[]> {
    return Promise.resolve(
      this.readAll()
        .filter((e) => e.tenant_id === tenantId && e.template_id === templateId)
        .sort((a, b) => a.ordem - b.ordem)
    )
  }
}

export const etapaDemandaTemplateRepo = new LocalEtapaDemandaTemplateRepository()
