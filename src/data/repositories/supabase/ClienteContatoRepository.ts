import { supabase } from '@/lib/supabase'
import type { ClienteContato } from '@/domain/types'

export class SupabaseClienteContatoRepository {
  async findAll(tenantId: string): Promise<ClienteContato[]> {
    const { data, error } = await supabase.from('cliente_contatos').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<ClienteContato | null> {
    const { data, error } = await supabase.from('cliente_contatos').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ClienteContato[]> {
    const { data, error } = await supabase.from('cliente_contatos').select('*').eq('tenant_id', tenantId).eq('cliente_id', clienteId)
    if (error) throw error
    return data ?? []
  }

  async create(item: ClienteContato): Promise<ClienteContato> {
    const { data, error } = await supabase.from('cliente_contatos').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<ClienteContato>): Promise<ClienteContato> {
    const { data: updated, error } = await supabase.from('cliente_contatos').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('cliente_contatos').delete().eq('id', id)
    if (error) throw error
  }
}
