import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Contract } from '@/domain/types'
import type { ContractRepository as IContractRepository } from '../interfaces'

function isPrincipal(c: Contract): boolean {
  return !c.natureza || c.natureza === 'principal'
}

export class LocalContractRepository
  extends BaseLocalStorageRepository<Contract>
  implements IContractRepository
{
  constructor() {
    super('contracts')
  }

  async findByClient(tenantId: string, clientId: string): Promise<Contract[]> {
    return Promise.resolve(
      this.readAll().filter((c) => c.tenant_id === tenantId && c.client_id === clientId)
    )
  }

  async findActive(tenantId: string): Promise<Contract[]> {
    return Promise.resolve(
      this.readAll().filter((c) => c.tenant_id === tenantId && c.status === 'ativo')
    )
  }

  async findPrincipalAtivo(tenantId: string, clientId: string): Promise<Contract | null> {
    return Promise.resolve(
      this.readAll().find(
        (c) => c.tenant_id === tenantId && c.client_id === clientId && isPrincipal(c) && c.status === 'ativo'
      ) ?? null
    )
  }

  async create(contract: Contract): Promise<Contract> {
    if (isPrincipal(contract) && contract.status === 'ativo') {
      const existing = this.readAll().find(
        (c) => c.tenant_id === contract.tenant_id && c.client_id === contract.client_id && isPrincipal(c) && c.status === 'ativo'
      )
      if (existing) {
        throw new Error('Já existe um contrato principal ativo para este cliente.')
      }
    }
    return super.create(contract)
  }

  async update(id: string, data: Partial<Contract>): Promise<Contract> {
    if (data.status === 'ativo') {
      const current = this.readAll().find((c) => c.id === id)
      if (current && isPrincipal({ ...current, ...data })) {
        const conflito = this.readAll().find(
          (c) => c.id !== id && c.tenant_id === current.tenant_id && c.client_id === current.client_id && isPrincipal(c) && c.status === 'ativo'
        )
        if (conflito) {
          throw new Error('Já existe um contrato principal ativo para este cliente.')
        }
      }
    }
    return super.update(id, data)
  }
}
