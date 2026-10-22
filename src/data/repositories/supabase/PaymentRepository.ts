import { supabase } from '@/lib/supabase'
import type { Payment } from '@/domain/types'
import type { PaymentRepository as IPaymentRepository } from '../interfaces'

export class SupabasePaymentRepository implements IPaymentRepository {
  async findByInvoice(invoiceId: string): Promise<Payment[]> {
    const { data, error } = await supabase.from('payments').select('*').eq('invoice_id', invoiceId)
    if (error) throw error
    return data ?? []
  }

  async create(item: Payment): Promise<Payment> {
    const { data, error } = await supabase.from('payments').insert(item).select().single()
    if (error) throw error
    return data
  }
}
