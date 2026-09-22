import type { Payment } from '@/domain/types'
import type { PaymentRepository as IPaymentRepository } from '../interfaces'

export class LocalPaymentRepository implements IPaymentRepository {
  private readonly key = 'vb_payments'

  private readAll(): Payment[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as Payment[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: Payment[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findByInvoice(invoiceId: string): Promise<Payment[]> {
    return Promise.resolve(this.readAll().filter((p) => p.invoice_id === invoiceId))
  }

  async create(item: Payment): Promise<Payment> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }
}
