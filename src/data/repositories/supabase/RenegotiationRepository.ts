import { supabase } from '@/lib/supabase'
import type { Renegotiation } from '@/domain/types'
import type { RenegotiationRepository as IRenegotiationRepository } from '../interfaces'

export class SupabaseRenegotiationRepository implements IRenegotiationRepository {
  async findAll(tenantId: string): Promise<Renegotiation[]> {
    const { data, error } = await supabase.from('renegotiations').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Renegotiation | null> {
    const { data, error } = await supabase.from('renegotiations').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByClient(tenantId: string, clientId: string): Promise<Renegotiation[]> {
    const { data, error } = await supabase.from('renegotiations').select('*').eq('tenant_id', tenantId).eq('client_id', clientId)
    if (error) throw error
    return data ?? []
  }

  async create(item: Renegotiation): Promise<Renegotiation> {
    const { data, error } = await supabase.from('renegotiations').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Renegotiation>): Promise<Renegotiation> {
    const { data: updated, error } = await supabase.from('renegotiations').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('renegotiations').delete().eq('id', id)
    if (error) throw error
  }
}
