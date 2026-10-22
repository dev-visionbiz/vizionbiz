import { supabase } from '@/lib/supabase'
import type { ClienteCnae } from '@/domain/types'

export class SupabaseClienteCnaeRepository {
  async findAll(tenantId: string): Promise<ClienteCnae[]> {
    const { data, error } = await supabase.from('cliente_cnaes').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<ClienteCnae | null> {
    const { data, error } = await supabase.from('cliente_cnaes').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ClienteCnae[]> {
    const { data, error } = await supabase.from('cliente_cnaes').select('*').eq('tenant_id', tenantId).eq('cliente_id', clienteId)
    if (error) throw error
    return data ?? []
  }

  async create(item: ClienteCnae): Promise<ClienteCnae> {
    const { data, error } = await supabase.from('cliente_cnaes').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<ClienteCnae>): Promise<ClienteCnae> {
    const { data: updated, error } = await supabase.from('cliente_cnaes').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('cliente_cnaes').delete().eq('id', id)
    if (error) throw error
  }

  async replaceAllByCliente(tenantId: string, clienteId: string, novos: ClienteCnae[]): Promise<ClienteCnae[]> {
    const { error: delError } = await supabase
      .from('cliente_cnaes')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('cliente_id', clienteId)
    if (delError) throw delError
    if (novos.length === 0) return []
    const { data, error } = await supabase.from('cliente_cnaes').insert(novos).select()
    if (error) throw error
    return data ?? []
  }
}
