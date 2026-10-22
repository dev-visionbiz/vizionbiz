import { supabase } from '@/lib/supabase'
import type { Fluxo } from '@/domain/types'
import type { FluxoRepository as IFluxoRepository } from '../interfaces'

export class SupabaseFluxoRepository implements IFluxoRepository {
  async findAll(tenantId: string): Promise<Fluxo[]> {
    const { data, error } = await supabase.from('fluxos').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Fluxo | null> {
    const { data, error } = await supabase.from('fluxos').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findAtivos(tenantId: string): Promise<Fluxo[]> {
    const { data, error } = await supabase.from('fluxos').select('*').eq('tenant_id', tenantId).eq('ativo', true)
    if (error) throw error
    return data ?? []
  }

  async create(item: Fluxo): Promise<Fluxo> {
    const { data, error } = await supabase.from('fluxos').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Fluxo>): Promise<Fluxo> {
    const { data: updated, error } = await supabase.from('fluxos').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('fluxos').delete().eq('id', id)
    if (error) throw error
  }
}
