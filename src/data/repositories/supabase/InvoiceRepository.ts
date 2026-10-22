import { supabase } from '@/lib/supabase'
import type { Invoice, InvoiceStatus } from '@/domain/types'
import type { InvoiceRepository as IInvoiceRepository } from '../interfaces'

export class SupabaseInvoiceRepository implements IInvoiceRepository {
  async findAll(tenantId: string): Promise<Invoice[]> {
    const { data, error } = await supabase.from('invoices').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByClient(tenantId: string, clientId: string): Promise<Invoice[]> {
    const { data, error } = await supabase.from('invoices').select('*').eq('tenant_id', tenantId).eq('client_id', clientId)
    if (error) throw error
    return data ?? []
  }

  async findByStatus(tenantId: string, status: InvoiceStatus): Promise<Invoice[]> {
    const { data, error } = await supabase.from('invoices').select('*').eq('tenant_id', tenantId).eq('status', status)
    if (error) throw error
    return data ?? []
  }

  async findOverdue(tenantId: string, hoje: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['aberta', 'vencida'])
      .lt('vencimento', hoje)
    if (error) throw error
    return data ?? []
  }

  async findByCompetencia(tenantId: string, competencia: string): Promise<Invoice[]> {
    const { data, error } = await supabase.from('invoices').select('*').eq('tenant_id', tenantId).eq('competencia', competencia)
    if (error) throw error
    return data ?? []
  }

  async create(item: Invoice): Promise<Invoice> {
    const { data, error } = await supabase.from('invoices').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const { data: updated, error } = await supabase.from('invoices').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) throw error
  }
}
