import { supabase } from '@/lib/supabase'
import type { ServicoRealizado } from '@/domain/types'
import type { ServicoRealizadoRepository as IServicoRealizadoRepository } from '../interfaces'

export class SupabaseServicoRealizadoRepository implements IServicoRealizadoRepository {
  async findAll(tenantId: string): Promise<ServicoRealizado[]> {
    const { data, error } = await supabase.from('servicos_realizados').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<ServicoRealizado | null> {
    const { data, error } = await supabase.from('servicos_realizados').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ServicoRealizado[]> {
    const { data, error } = await supabase.from('servicos_realizados').select('*').eq('tenant_id', tenantId).eq('cliente_id', clienteId)
    if (error) throw error
    return data ?? []
  }

  async findPendentes(tenantId: string): Promise<ServicoRealizado[]> {
    const { data, error } = await supabase.from('servicos_realizados').select('*').eq('tenant_id', tenantId).eq('status', 'pendente_cobranca')
    if (error) throw error
    return data ?? []
  }

  async findByCompetencia(tenantId: string, competencia: string): Promise<ServicoRealizado[]> {
    const { data, error } = await supabase.from('servicos_realizados').select('*').eq('tenant_id', tenantId).eq('competencia', competencia)
    if (error) throw error
    return data ?? []
  }

  async create(item: ServicoRealizado): Promise<ServicoRealizado> {
    const { data, error } = await supabase.from('servicos_realizados').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<ServicoRealizado>): Promise<ServicoRealizado> {
    const { data: updated, error } = await supabase.from('servicos_realizados').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('servicos_realizados').delete().eq('id', id)
    if (error) throw error
  }
}
