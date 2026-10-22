import { supabase } from '@/lib/supabase'
import type { Client, ClientStatus } from '@/domain/types'
import type { ClientRepository as IClientRepository } from '../interfaces'

export class SupabaseClientRepository implements IClientRepository {
  async findAll(tenantId: string): Promise<Client[]> {
    const { data, error } = await supabase.from('clients').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Client | null> {
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findActive(tenantId: string): Promise<Client[]> {
    const { data, error } = await supabase.from('clients').select('*').eq('tenant_id', tenantId).eq('status', 'ativo')
    if (error) throw error
    return data ?? []
  }

  async findByStatus(tenantId: string, status: ClientStatus): Promise<Client[]> {
    const { data, error } = await supabase.from('clients').select('*').eq('tenant_id', tenantId).eq('status', status)
    if (error) throw error
    return data ?? []
  }

  async create(item: Client): Promise<Client> {
    const { data, error } = await supabase.from('clients').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Client>): Promise<Client> {
    const { data: updated, error } = await supabase.from('clients').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
  }
}
