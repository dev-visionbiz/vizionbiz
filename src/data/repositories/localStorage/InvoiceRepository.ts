import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Invoice, InvoiceStatus } from '@/domain/types'
import type { InvoiceRepository as IInvoiceRepository } from '../interfaces'

export class LocalInvoiceRepository
  extends BaseLocalStorageRepository<Invoice>
  implements IInvoiceRepository
{
  constructor() {
    super('invoices')
  }

  async findByClient(tenantId: string, clientId: string): Promise<Invoice[]> {
    return Promise.resolve(
      this.readAll().filter((i) => i.tenant_id === tenantId && i.client_id === clientId)
    )
  }

  async findByStatus(tenantId: string, status: InvoiceStatus): Promise<Invoice[]> {
    return Promise.resolve(
      this.readAll().filter((i) => i.tenant_id === tenantId && i.status === status)
    )
  }

  async findOverdue(tenantId: string, hoje: string): Promise<Invoice[]> {
    return Promise.resolve(
      this.readAll().filter(
        (i) => i.tenant_id === tenantId && i.status === 'vencida' && i.vencimento < hoje
      )
    )
  }

  async findByCompetencia(tenantId: string, competencia: string): Promise<Invoice[]> {
    return Promise.resolve(
      this.readAll().filter((i) => i.tenant_id === tenantId && i.competencia === competencia)
    )
  }
}
