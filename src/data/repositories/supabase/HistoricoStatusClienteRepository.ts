import { supabase } from '@/lib/supabase'
import type { HistoricoStatusCliente } from '@/domain/types'
import type { HistoricoStatusClienteRepository as IHistoricoStatusClienteRepository } from '../interfaces'

export class SupabaseHistoricoStatusClienteRepository implements IHistoricoStatusClienteRepository {
  async findAll(tenantId: string): Promise<HistoricoStatusCliente[]> {
    const { data, error } = await supabase.from('historico_status_clientes').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<HistoricoStatusCliente | null> {
    const { data, error } = await supabase.from('historico_status_clientes').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByClient(tenantId: string, clientId: string): Promise<HistoricoStatusCliente[]> {
    const { data, error } = await supabase.from('historico_status_clientes').select('*').eq('tenant_id', tenantId).eq('client_id', clientId)
    if (error) throw error
    return data ?? []
  }

  async create(item: HistoricoStatusCliente): Promise<HistoricoStatusCliente> {
    const { data, error } = await supabase.from('historico_status_clientes').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<HistoricoStatusCliente>): Promise<HistoricoStatusCliente> {
    const { data: updated, error } = await supabase.from('historico_status_clientes').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('historico_status_clientes').delete().eq('id', id)
    if (error) throw error
  }
}
