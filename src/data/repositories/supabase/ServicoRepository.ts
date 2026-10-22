import { supabase } from '@/lib/supabase'
import type { Servico } from '@/domain/types'
import type { ServicoRepository as IServicoRepository } from '../interfaces'

export class SupabaseServicoRepository implements IServicoRepository {
  async findAll(tenantId: string): Promise<Servico[]> {
    const { data, error } = await supabase.from('servicos').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Servico | null> {
    const { data, error } = await supabase.from('servicos').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findAtivos(tenantId: string): Promise<Servico[]> {
    const { data, error } = await supabase.from('servicos').select('*').eq('tenant_id', tenantId).eq('ativo', true)
    if (error) throw error
    return data ?? []
  }

  async create(item: Servico): Promise<Servico> {
    const { data, error } = await supabase.from('servicos').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Servico>): Promise<Servico> {
    const { data: updated, error } = await supabase.from('servicos').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('servicos').delete().eq('id', id)
    if (error) throw error
  }
}
