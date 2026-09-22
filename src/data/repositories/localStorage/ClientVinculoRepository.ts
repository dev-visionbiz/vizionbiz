import type { ClientVinculo } from '@/domain/types'
import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'

export class LocalClientVinculoRepository extends BaseLocalStorageRepository<ClientVinculo> {
  constructor() { super('client_vinculos') }

  async findByPJ(tenantId: string, pjId: string): Promise<ClientVinculo[]> {
    return (await this.findAll(tenantId)).filter((v) => v.client_pj_id === pjId)
  }

  async findByPF(tenantId: string, pfId: string): Promise<ClientVinculo[]> {
    return (await this.findAll(tenantId)).filter((v) => v.client_pf_id === pfId)
  }
}
