import { supabase } from '@/lib/supabase'
import type { RotinaCliente } from '@/domain/types'
import type { RotinaClienteRepository as IRotinaClienteRepository } from '../interfaces'

export class SupabaseRotinaClienteRepository implements IRotinaClienteRepository {
  async findAll(tenantId: string): Promise<RotinaCliente[]> {
    const { data, error } = await supabase.from('rotina_clientes').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<RotinaCliente | null> {
    const { data, error } = await supabase.from('rotina_clientes').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByRotina(tenantId: string, rotinaId: string): Promise<RotinaCliente[]> {
    const { data, error } = await supabase.from('rotina_clientes').select('*').eq('tenant_id', tenantId).eq('rotina_id', rotinaId)
    if (error) throw error
    return data ?? []
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<RotinaCliente[]> {
    const { data, error } = await supabase.from('rotina_clientes').select('*').eq('tenant_id', tenantId).eq('cliente_id', clienteId)
    if (error) throw error
    return data ?? []
  }

  async findAtivos(tenantId: string, rotinaId: string): Promise<RotinaCliente[]> {
    const { data, error } = await supabase
      .from('rotina_clientes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('rotina_id', rotinaId)
      .eq('ativo', true)
    if (error) throw error
    return data ?? []
  }

  async create(item: RotinaCliente): Promise<RotinaCliente> {
    const { data, error } = await supabase.from('rotina_clientes').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<RotinaCliente>): Promise<RotinaCliente> {
    const { data: updated, error } = await supabase.from('rotina_clientes').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('rotina_clientes').delete().eq('id', id)
    if (error) throw error
  }
}
