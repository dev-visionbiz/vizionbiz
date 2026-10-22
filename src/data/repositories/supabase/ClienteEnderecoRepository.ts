import { supabase } from '@/lib/supabase'
import type { ClienteEndereco } from '@/domain/types'

export class SupabaseClienteEnderecoRepository {
  async findAll(tenantId: string): Promise<ClienteEndereco[]> {
    const { data, error } = await supabase.from('cliente_enderecos').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<ClienteEndereco | null> {
    const { data, error } = await supabase.from('cliente_enderecos').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ClienteEndereco[]> {
    const { data, error } = await supabase.from('cliente_enderecos').select('*').eq('tenant_id', tenantId).eq('cliente_id', clienteId)
    if (error) throw error
    return data ?? []
  }

  async create(item: ClienteEndereco): Promise<ClienteEndereco> {
    const { data, error } = await supabase.from('cliente_enderecos').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<ClienteEndereco>): Promise<ClienteEndereco> {
    const { data: updated, error } = await supabase.from('cliente_enderecos').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('cliente_enderecos').delete().eq('id', id)
    if (error) throw error
  }
}
